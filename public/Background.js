/* global chrome */
const source = ["window", "screen"];
let backgroundPeer;
let iceCandidates = [];

chrome.runtime.onConnect.addListener((port) => {

    port.postMessage({ message: "Port Connected" })

    port.onMessage.addListener((msg) => {
        if(msg.message === "Content-SDP")
        {
            initiateRTC(msg.sdp);
        }

        if(msg.message === "Ice")
        {
            iceCandidates.push(msg.candidate);
        }

        if(msg.message === "Close-RTC-Connection")
        {
            backgroundPeer.close();
            backgroundPeer = undefined;
        }
    })

    async function initiateRTC(sdp) {
        backgroundPeer = new RTCPeerConnection();
        backgroundPeer.onicecandidate = handleIceCandidate;
        await backgroundPeer.setRemoteDescription(new RTCSessionDescription(sdp));
        chrome.desktopCapture.chooseDesktopMedia(source, (streamID) => {
            navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: streamID,
                        maxWidth: window.screen.width,
                        maxHeight: window.screen.height
                    },
                    optional: [
                        { maxFrameRate: 30 }
                      ]
                }
            })
            .then(async (stream) => {
                stream.oninactive = () => {
                    port.postMessage({ message: "Stream-Inactive" })
                }

                stream.getVideoTracks().forEach((track) => {
                    backgroundPeer.addTrack(track, stream);
                })
                let answer = await backgroundPeer.createAnswer();
                await backgroundPeer.setLocalDescription(answer);
                port.postMessage({ message: "Background-SDP", sdp: backgroundPeer.localDescription });
                addCandidates()
            })
            .catch((err) => {
                console.log(`ERROR WHILE CAPTURING STREAM: ${err}`);
            })
        })
    }


    function handleIceCandidate(e) {
        if(e.candidate)
            port.postMessage({ message: "Ice", candidate: e.candidate })
    }

    function addCandidates() {
        iceCandidates.forEach((candidate) => {
            backgroundPeer.addIceCandidate(new RTCIceCandidate(candidate));
        })
    }
})