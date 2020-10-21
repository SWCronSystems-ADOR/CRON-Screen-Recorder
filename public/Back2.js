/* global chrome */


const source = ["screen", "window"];
let backgroundConnection;


chrome.runtime.onConnect.addListener((port) => {
    port.postMessage({message: "Port Connected"});

    port.onMessage.addListener((msg) => {
        if(msg.message === "Content-SDP")
        {
            backgroundConnection = new RTCPeerConnection();
            backgroundConnection.onicecandidate = (e) => {
                if(e.candidate)
                {
                    console.log('onice background')
                    port.postMessage({ message: "Background Ice-Candidate", candidate: e.candidate });
                }
            }
            chrome.desktopCapture.chooseDesktopMedia(source, (streamID) => {
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

                })
            });
        }
    })
})


