import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import logo from './logo.svg';
import './App.css';

// const adapter = require("./bower_components/adapter.js/adapter");
// const kurentoUtils = require("./bower_components/kurento-utils/js/kurento-utils");

// KURENTO TEST PROTOTYPE

const ws = new WebSocket('wss://' + window.location.host + '/one2many');

const kurentoUtils = window.kurentoUtils;

class App extends Component {
  webRtcPeer = null;
  video = null;

  componentDidMount () {
    // Add listeners to web socket

    this.video = ReactDOM.findDOMNode(this.refs.videoTag);

    this.addSocketListeners(ws);
  }

  componentWillUnmount () {
    ws.close();
  }

  addSocketListeners () {
    ws.onmessage = function(message) {
    	let parsedMessage = JSON.parse(message.data);
    	console.info('Received message: ' + message.data);

    	switch (parsedMessage.id) {
      	case 'presenterResponse':
      		this.presenterResponse(parsedMessage);
      		break;
      	case 'viewerResponse':
      		this.viewerResponse(parsedMessage);
      		break;
      	case 'stopCommunication':
      		this.dispose();
      		break;
      	case 'iceCandidate':
      		this.webRtcPeer.addIceCandidate(parsedMessage.candidate)
      		break;
      	default:
      		console.error('Unrecognized message', parsedMessage);
    	}
    }
  }

  presenterResponse = (message) => {
    if (message.response !== 'accepted') {
  		let errorMsg = message.message ? message.message : 'Unknow error';
  		console.log('Call rejected: ' + errorMsg);
  		this.dispose();
  	} else {
  		this.webRtcPeer.processAnswer(message.sdpAnswer);
  	}
  }

  viewerResponse = (message) => {
    if (message.response !== 'accepted') {
  		let errorMsg = message.message ? message.message : 'Unknow error';
  		console.log('Call rejected: ' + errorMsg);
  		this.dispose();
  	} else {
  		this.webRtcPeer.processAnswer(message.sdpAnswer);
  	}
  }

  generatePresenter = () => {
    if (!this.webRtcPeer) {
      let options = {
        localVideo: this.video,
        onicecandidate: this.onIceCandidate
      }

      this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, (err) => {
        if (err) return this.onError(err);

        this.generateOffer(this.onOfferPresenter);
      })
    }
  }

  onOfferPresenter = (err, offer) => {
    if (err) {
      return this.onError(err);
    }

    let message = {
      id: 'presenter',
      sdpOffer: offer
    }
    this.send(message);
  }

  generateViewer = () => {
    if (!this.webRtcPeer) {

      let options = {
        remoteVideo: this.video,
        onicecandidate: this.onIceCandidate
      }

      this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, (err) => {
        if (err) return this.onError(err);

        this.generateOffer(this.onOfferViewer);
      });
    }
  }

  stop = () => {
    if (this.webRtcPeer) {
      let message = {
        id: 'stop'
      }

      this.sendMessage(message);
      this.dispose();
    }
  }

  dispose = () => {
    if (this.webRtcPeer) {
      this.webRtcPeer.dispose();
      this.webRtcPeer = null;
    }
  }

  sendMessage = (message) => {
    let jsonMsg = JSON.stringify(message);
    ws.send(jsonMsg);
  }

  render () {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Kurento Test</h1>
        </header>
        <p className="App-intro">
          Test the Kurento
        </p>

        <div className='main-display'>
          <nav>
            <button>Connect as Presenter</button>
            <button>Connect as Attendee</button>
            <button>Stop</button>
          </nav>

          <video ref='videoTag' id="video" autoPlay width="640px" height="480px"></video>
        </div>
      </div>
    );
  }
}

export default App;
