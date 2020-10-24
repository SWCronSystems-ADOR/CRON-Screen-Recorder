
import { Component } from 'react';
import { Decoder, tools, Reader } from 'ts-ebml';

/* global chrome */

export class ContentScript extends Component {
  constructor() {
    super();
    this.contentPeer = undefined;
    this.port = chrome.runtime.connect(null, { name: "Connect" });
    this.iceCandidates = [];
    this.recorder = undefined;
    this.recordedData = undefined;
    this.streamStatus = undefined;
  }

  readAsArrayBuffer = function(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(blob);
        reader.onloadend = () => { resolve(reader.result); };
        reader.onerror = (ev) => { reject(ev.error); };
    });
  }


  injectMetadata = function(blob) {
    const decoder = new Decoder();
    const reader = new Reader();
    reader.logging = false;
    reader.drop_default_duration = false;

    this.readAsArrayBuffer(blob).then((buffer) => {
        const elms = decoder.decode(buffer);
        elms.forEach((elm) => { reader.read(elm); });
        reader.stop();

        var refinedMetadataBuf = tools.makeMetadataSeekable(
            reader.metadatas, reader.duration, reader.cues);
        var body = buffer.slice(reader.metadataSize);

        const result = new Blob([refinedMetadataBuf, body],
            {type: blob.type});
       return result;
    })
    .catch((err) => {
      console.log(`ERROR IN FIXING METADATA: ${err}`);
    })
  }

  seekableVideo = (stream) => {
    if(stream.active === true && this.recorder === undefined)
    {
      this.recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
      this.recordedData = [];
      
      this.recorder.ondataavailable = (e) => {
        if(e.data.size > 0)
        {
          this.recordedData.push(e.data)
        }
      }
      this.recorder.start(1000);
    }
  }

  handleTracks = (e) => {
    let stream = e.streams[0];
    this.streamStatus = stream.active;
    e.track.onmute = () => {
      console.log('Track muted');
      if(this.recorder.state !== 'inactive')
      {
        this.recorder.stop();
      }
        let blob = new Blob(this.recordedData);
        this.recordedData = undefined;
        this.recorder = undefined;
        let decoder = new Decoder()
        let reader = new Reader();
        this.readAsArrayBuffer(blob).then((buffer) => {
          let elms = decoder.decode(buffer);
          elms.forEach((elm) => {
            reader.read(elm);
          })
          reader.stop();
          let refinedMetadataBuf = tools.makeMetadataSeekable(reader.metadatas, reader.duration, reader.cues);
          let body = buffer.slice(reader.metadataSize);
          let result = new Blob([refinedMetadataBuf, body], { type: blob.type })
          let vidURL = window.URL.createObjectURL(result);
          let a = document.createElement('a');
          document.body.appendChild(a);
          a.style = 'display: none';
          a.href = vidURL;
          a.download = `Screencapture_${Date()}.webm`;
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(vidURL);
            if(this.streamStatus === false)
            {
              this.contentPeer.close();
              this.contentPeer = undefined;
              this.port.postMessage({ message: "Close-RTC-Connection" })
              window.postMessage("Stream Stopped", "*");
            }
          }, 1000)
        })
        .catch((err) => {
          console.log(`ERROR: ${err}`);
          alert('Some Error Occurred While Recording Screen');
          window.postMessage("Stream Stopped", "*");
        })
      
    }

    e.track.onunmute = () => {
      console.log('Track unmuted');
      this.seekableVideo(stream);
      window.postMessage("Stream Started", "*");
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


  handleMessagesFromApp = (e) => {
    if(e.data.message === "start" && e.source === window)
    {
      window.postMessage("started", "*");
      this.initiateRTC()
    }
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

      if(msg.message === "Stream-Inactive")
      {
        this.streamStatus = false;
      }

    })



    window.addEventListener("message", this.handleMessagesFromApp)
  }

  render = () => {
    return null;
  }
}

export default ContentScript;
