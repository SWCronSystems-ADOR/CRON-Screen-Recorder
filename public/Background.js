/* global chrome */


const source = ["screen", "window"];
let backgroundConnection;

chrome.browserAction.onClicked.addListener(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        let activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, {message: "Extension Clicked"});
    });
});

chrome.runtime.onConnect.addListener((port) => {
    port.postMessage({message: "Port Connected"});

    port.onMessage.addListener((msg) => {
        if(msg.message === "Content-SDP")
        {
            backgroundConnection = new RTCPeerConnection();
            backgroundConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
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

                    // let recorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9"});
                    // let recordedData = [];
                    // recorder.start(1000);
                    // recorder.ondataavailable = (e) => {
                    //     if(e.data.size > 0)
                    //     {
                    //         recordedData.push(e.data);
                    //     }
                    // }

                    // stream.oninactive = () => {
                    //     if(recorder.state !== 'inactive')
                	// 		recorder.stop();
                	// 	let blob = new Blob(recordedData);
                    //     recordedData = [];
                    //     let vidURL = window.URL.createObjectURL(blob);
                    //     port.postMessage({message: "Stream Stopped" });
                    //     // window.open(vidURL);
                	// 	let a = document.createElement('a');
                	// 	document.body.appendChild(a);
                	// 	a.style = 'display: none';
                	// 	a.href = vidURL;
                	// 	a.download = 'Screencapture.webm';
                	// 	a.click();
                    //     window.URL.revokeObjectURL(vidURL);
                    // }

                    stream.getTracks().forEach((track) => {
                        backgroundConnection.addTrack(track, stream);
                    })
                    backgroundConnection.createAnswer()
                    .then((answer) => {
                        backgroundConnection.setLocalDescription(answer);
                    })
                    .then(() => {
                        port.postMessage({ message: "Background-SDP", sdp: backgroundConnection.localDescription })
                    })
                })
            });
        }


        if(msg.message === "Content Ice-Candidate")
        {
            if(msg.candidate)
            {
                console.log('msg ice from content');
                backgroundConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
            }
            
            // if(msg.candidate)
            //     backgroundConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }


    })
})


