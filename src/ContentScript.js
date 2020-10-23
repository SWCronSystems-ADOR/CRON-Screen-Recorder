import { Component } from 'react';

/* global chrome */

export class ContentScript extends Component {
  constructor() {
    super();
    this.contentPeer = undefined;
    this.port = chrome.runtime.connect(null, { name: "Connect" });
    this.iceCandidates = [];
  }

  handleTracks = (e) => {
    let stream = e.streams[0];
    let recorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9"});
    let recordedData = [];
    e.track.onmute = () => {
      console.log('Track muted');
      if(recorder.state !== 'inactive')
        recorder.stop();
      let blob = new Blob(recordedData);
      recordedData = [];
      let vidURL = window.URL.createObjectURL(blob);
      let a = document.createElement('a');
      document.body.appendChild(a);
      a.style = 'display: none';
      a.href = vidURL;
      a.download = 'Screencapture.webm';
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(vidURL);
      }, 1000)
    }

    e.track.onunmute = () => {
      console.log('Track unmuted');
      recorder.start(500);
      recorder.ondataavailable = (e) => {
        if(e.data.size > 0)
        {
          recordedData.push(e.data);
        }
      }
    }
  }


  handleIceCandidates = (e) => {
    if(e.candidate)
      this.port.postMessage({ message: "Ice", candidate: e.candidate })
  }


  initiateRTC =  async () => {
    this.contentPeer = new RTCPeerConnection();
    this.contentPeer.ontrack = this.handleTracks;
    this.contentPeer.onicecandidate = this.handleIceCandidates;
    let offer = await this.contentPeer.createOffer({ offerToReceiveVideo: true });
    await this.contentPeer.setLocalDescription(offer);
    this.port.postMessage({ message: "Content-SDP", sdp: this.contentPeer.localDescription });
  }

  componentDidMount = () => {
    this.port.onMessage.addListener((msg) => {
      if(msg.message === "Port Connected")
      {
        console.log(msg.message);
      }

      if(msg.message === "Background-SDP")
      {
        this.contentPeer.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        this.iceCandidates.forEach((candidate) => {
          this.contentPeer.addIceCandidate(new RTCIceCandidate(candidate));
        })
      }

      if(msg.message === "Ice")
      {
        this.iceCandidates.push(msg.candidate);
      }

    })



    //initiate RTC connection from content script after two second from when the extension loads
    setTimeout(() => {
      this.initiateRTC()
    }, 2000)

    setInterval(() => {
      if(this.contentPeer)
      {
        if(this.contentPeer.connectionState === "connected")
        {
          console.log('Content Peer Connected');
        }
      }
    }, 3000)
  }

  render = () => {
    return null;
  }
}

export default ContentScript;
