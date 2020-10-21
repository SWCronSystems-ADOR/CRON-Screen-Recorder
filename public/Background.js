/* global chrome */


const source = ["screen", "window"];
let backgroundConnection;


chrome.runtime.onConnect.addListener((port) => {
    port.postMessage({message: "Port Connected"});

    port.onMessage.addListener((msg) => {
        if(msg.message === "Initiate RTC")
        {
            backgroundConnection = new RTCPeerConnection();
            backgroundConnection.onicecandidate = (e) => {
                if(e.candidate)
                {
                    port.postMessage({ message: "Ice", candidate: e.candidate })
                }
            }
            backgroundConnection.onconnectionstatechange = (e) => {
                console.log(e);
            }
            chrome.desktopCapture.chooseDesktopMedia(source, (streamID) => {
                port.postMessage({message: `Waiting For Affirmation`});
                navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            chromeMediaSourceId: streamID,
                            maxWidth: window.screen.width,
                            maxHeight: window.screen.height
                        }
                    }
                })
                .then((stream) => {   
                    
                    stream.getVideoTracks().forEach((track) => {
                        backgroundConnection.addTrack(track, stream);
                    })

                    backgroundConnection.createOffer({ offerToReceiveVideo: true })
                    .then((offer) => {
                        backgroundConnection.setLocalDescription(offer)
                        .then(() => {
                            console.log(backgroundConnection)
                            port.postMessage({ message: "Background-SDP", sdp: backgroundConnection.localDescription })
                        })
                    })       
                })
            })
        }

        if(msg.message === "Content-SDP")
        {
            backgroundConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp))
            console.log(backgroundConnection);
        }

        // if(msg.message === "Ice")
        // {
        //     backgroundConnection.addIceCandidate(new RTCIceCandidate(msg.candidate))
        //     // console.log(backgroundConnection);
        // }
    })
})


