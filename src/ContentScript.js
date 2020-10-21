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
    vid.style.border = '2px solid black';
    vid.style.zIndex = '3000'
    document.body.appendChild(vid);

    tracks.track.onmute = () => {
      console.log('video muted');
      if(this.recorder.state !== 'inactive')
        this.recorder.stop();
      let blob = new Blob(this.recordedData);
      this.recordedData = [];
      let url = URL.createObjectURL(blob);
      let a = document.createElement('a');
      document.body.appendChild(a);
      a.style = 'display: none';
      a.href = url;
      a.download = 'Screencapture.webm';
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 1000)
    }

    tracks.track.onunmute = () => {
      console.log('video unmuted');
      this.recorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp8"});
      this.recorder.start(1000);
      this.recorder.ondataavailable = (e) => {
        if(e.data.size > 0)
        {
          this.recordedData.push(e.data);
          console.log(e.data);
        }
      }
    }
  }

  handleIceCandidate = (e) => {
    if(e.candidate)
    {
      this.port.postMessage({ message: "Ice", candidate: e.candidate });
    }
  }

  componentDidMount = () => {

    this.port.onMessage.addListener((msg) => { 
      if(msg.message === "Background-SDP")
      {
        this.contentConnection = new RTCPeerConnection();
        this.contentConnection.ontrack = this.handleTracks;
        this.contentConnection.onicecandidate = this.handleIceCandidate;
        this.contentConnection.oniceconnectionstatechange = (e) => {
          console.log(e)
        }
        this.contentConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        .then(() => {
          this.contentConnection.createAnswer()
          .then((answer) => {
            this.contentConnection.setLocalDescription(answer)
            .then(() => {
              this.port.postMessage({ message: "Content-SDP", sdp: this.contentConnection.localDescription })
              console.log(this.contentConnection);
            })
          })
        })
      }

      // if(msg.message === "Ice")
      // {
      //   // this.contentConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
      // }
    })


    setTimeout(() => {
      this.port.postMessage({ message: "Initiate RTC" });
    }, 3000)
  }


  render = () => {
    return null;
  }
}

export default ContentScript;
