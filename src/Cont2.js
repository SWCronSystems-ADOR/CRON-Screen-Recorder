import { Component } from 'react';

/* 
  global chrome
 */

export class ContentScript extends Component {
  constructor() {
    super();
    this.port = chrome.runtime.connect(null, { name: "RTC-Port" });
    this.contentConnection = undefined;
    this.recorder = undefined;
    this.recordedData = [];
  }


  handleTracks = (tracks) => {
    console.log(tracks);
    let stream = tracks.streams[0];
    let vid = document.createElement("video");
    vid.srcObject = stream;
    vid.autoplay = true;
    document.body.appendChild(vid);

    tracks.track.onmute = () => {
      console.log('video muted');
      // if(this.recorder.state !== 'inactive')
      //   this.recorder.stop();
      // let blob = new Blob(this.recordedData);
      // this.recordedData = [];
      // let url = URL.createObjectURL(blob);
      // let a = document.createElement('a');
      // document.body.appendChild(a);
      // a.style = 'display: none';
      // a.href = url;
      // a.download = 'Screencapture.webm';
      // a.click();
      // setTimeout(() => {
      //   document.body.removeChild(a);
      //   window.URL.revokeObjectURL(url);
      // }, 1000)
    }

    tracks.track.onunmute = () => {
      console.log('video unmuted');
      // this.recorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp8"});
      // this.recorder.start(1000);
      // this.recorder.ondataavailable = (e) => {
      //   if(e.data.size > 0)
      //   {
      //     // this.recordedData.push(e.data);
      //     console.log(e.data);
      //   }
      // }
    }
  }

  handleDataChannel = (e) => {
    console.log(e);
  }

  componentDidMount = () => {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log(request.message);
    });

    this.port.onMessage.addListener((request) => { 
      if(request.message === "Port Connected")
      {
        console.log(request.message);
      }
      if(request.message === "Background-SDP")
      {
        this.contentConnection.setRemoteDescription(new RTCSessionDescription(request.sdp));
      }
      if(request.message === "Background Ice-Candidate")
      {
        if(request.candidate)
        {
          this.contentConnection.addIceCandidate(new RTCIceCandidate(request.candidate));
        }
      }

    })


    setTimeout(() => {
      this.contentConnection = new RTCPeerConnection();
      this.contentConnection.onnegotiationneeded = async () => {
		await this.contentConnection.setLocalDescription(await this.contentConnection.createOffer());
		this.port.postMessage({ message: "Content-SDP",  })
	  }
    }, 5000)

  }


  render = () => {
    return null;
  }
}

export default ContentScript;
