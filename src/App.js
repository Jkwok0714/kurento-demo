import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import logo from './logo.svg';
import './App.css';

// const adapter = require("./bower_components/adapter.js/adapter");
// const kurentoUtils = require("./bower_components/kurento-utils/js/kurento-utils");

// KURENTO TEST PROTOTYPE

const TEST_FROM_REACT = true;

const WEB_IMG = require('./img/webrtc.png');
// const SPINNER = require('./img/spinner.gif');

const ws = new WebSocket(TEST_FROM_REACT ? 'wss://localhost:8443/one2many' : 'wss://' + window.location.host + '/one2many');

const kurentoUtils = window.kurentoUtils;

class App extends Component {
  webRtcPeer = null;
  video = null;

  state = {
    loading: false,
    disabledPresenter: false
  }

  componentDidMount () {
    this.video = ReactDOM.findDOMNode(this.refs.videoTag);

    this.addSocketListeners(ws);
  }

  componentWillUnmount () {
    ws.close();
  }

  addSocketListeners () {
    ws.onmessage = (message) => {
    	let parsedMessage = JSON.parse(message.data);
    	// console.info('Received message: ' + message.data);

    	switch (parsedMessage.id) {
        case 'message':
          if (parsedMessage.message === 'newPresenter') {
            this.setState({ disabledPresenter: true });
          } else if (parsedMessage.message === 'noMorePresenter') {
            this.setState({ disabledPresenter: false });
          }
          break;
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
  		let errorMsg = message.message ? message.message : 'Unknown error';
  		console.log('Call rejected: ' + errorMsg);
  		this.dispose();
  	} else {
  		this.webRtcPeer.processAnswer(message.sdpAnswer);
  	}
  }

  viewerResponse = (message) => {
    if (message.response !== 'accepted') {
  		let errorMsg = message.message ? message.message : 'Unknown error';
  		console.log('Call rejected: ' + errorMsg);
      window.alert(errorMsg);
  		this.dispose();
  	} else {
  		this.webRtcPeer.processAnswer(message.sdpAnswer);
  	}
    this.setState({ loading: false });
  }

  generatePresenter = () => {
    if (!this.webRtcPeer) {
      let options = {
        localVideo: this.video,
        onicecandidate: this.onIceCandidate
      }

      const self = this;

      this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function (err) {
        if (err) return self.onError(err);

        this.generateOffer(self.onOfferPresenter);
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
    this.sendMessage(message);
  }

  onOfferViewer = (err, offer) => {
    if (err) {
      return this.onError(err);
    }

    let message = {
      id: 'viewer',
      sdpOffer: offer
    }

    this.sendMessage(message);
  }

  generateViewer = () => {
    if (!this.webRtcPeer) {

      let options = {
        remoteVideo: this.video,
        onicecandidate: this.onIceCandidate
      }

      const self = this;

      this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function (err) {
        if (err) return self.onError(err);

        this.generateOffer(self.onOfferViewer);
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

  onPresenterClick = () => {
    this.generatePresenter();
  }

  onViewerClick = () => {
    this.setState({ loading: true });
    this.generateViewer();
  }

  onError (err) {
    console.error('ERROR', err);
    window.alert(`Error: ${err.message ? err.message : JSON.stringify(err)}`)
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
            <button disabled={this.state.disabledPresenter} onClick={this.onPresenterClick}>Connect as Presenter</button>
            <button onClick={this.onViewerClick}>Connect as Attendee</button>
            <button onClick={this.stop}>Stop</button>
          </nav>

          <video ref='videoTag' id="video" autoPlay poster={WEB_IMG} width="640px" height="480px"></video>
        </div>
      </div>
    );
  }
}

export default App;
