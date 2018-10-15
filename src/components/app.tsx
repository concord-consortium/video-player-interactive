import * as React from "react";
import videojs from "video.js";
const iframePhone = require("iframe-phone");

import "./app.sass";
import "../../node_modules/video.js/dist/video-js.css";

const inIframe = (() => {
  try {
    return window.self !== window.top;
  }
  catch (e) {
    return true;
  }
})();

interface State {
  inAuthoringMode: boolean;
  videoUrl: string;
  disableNextButton: boolean;
}

export class AppComponent extends React.Component<{}, State> {
  public state: State = {
    inAuthoringMode: !inIframe,
    videoUrl: "",
    disableNextButton: false,
  };

  private player: videojs.Player;
  private videoNode: HTMLVideoElement | null;
  private authoringUrl: HTMLInputElement | null;
  private laraPhone: any;

  public componentDidMount() {
    if (inIframe) {
      this.laraPhone = iframePhone.getIFrameEndpoint();
      this.laraPhone.addListener("hello", () => {
        this.laraPhone.post("supportedFeatures", {
          apiVersion: 1,
          features: {
            authoredState: true
          }
        });
      });
      this.laraPhone.addListener("initInteractive", (options: any) => {
        const {authoredState, mode} = options;
        this.setState({
          inAuthoringMode: mode === "authoring",
          videoUrl: (authoredState && authoredState.videoUrl) || "",
          disableNextButton: (authoredState && !!authoredState.disableNextButton) || false,
        }, () => this.loadPlayer());
      });
      this.laraPhone.addListener("getInteractiveState", () => {
        this.laraPhone.post("interactiveState", "nochange");
      });
      this.laraPhone.initialize();
    }
    else {
      this.loadPlayer();
    }
  }

  public componentWillUnmount() {
    if (this.player) {
      this.player.dispose();
    }
  }

  public render() {
    const {inAuthoringMode, videoUrl} = this.state;
    const videoPlayerContainerClassname = [
      "video-player-container",
      inAuthoringMode ? " authoring-mode" : "",
      videoUrl.length === 0 ? " hidden" : ""
    ].join("");
    return (
      <div className="app">
        {inAuthoringMode ? this.renderAuthoringForm() : null}
        <div className={videoPlayerContainerClassname}>
          <div className="video-player" data-vjs-player={true}>
            <video ref={ node => this.videoNode = node } className="video-js vjs-big-play-centered" />
          </div>
        </div>
      </div>
    );
  }

  private renderAuthoringForm() {
    return (
      <div className="authoring">
        <form onSubmit={this.handleAuthoringSave}>
          <span>LARA Video Player</span>
          <input type="text" ref={ node => this.authoringUrl = node } defaultValue={this.state.videoUrl} placeholder="Enter video url here..." />
          <input type="checkbox" onChange={this.handleDisableNextButtonChecked} checked={this.state.disableNextButton} /> Disable "Next" button
        </form>
      </div>
    );
  }

  private loadPlayer() {
    this.player = videojs(this.videoNode, {controls: true}, () => {
      if (this.state.disableNextButton) {
        this.laraPhone.post("navigation", {enableForwardNav: false, message: "Please watch the entire video"});
        this.player.on("ended", () => {
          this.laraPhone.post("navigation", {enableForwardNav: true});
        });
      }
      this.player.src(this.state.videoUrl);
    });
  }

  private handleAuthoringSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const {authoringUrl} = this;
    const videoUrl = ((authoringUrl && authoringUrl.value) || "").trim();
    this.player.src(videoUrl);
    this.setState({videoUrl}, this.updateAuthoredState);
  }

  private handleDisableNextButtonChecked = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({disableNextButton: e.target.checked}, this.updateAuthoredState);
  }

  private updateAuthoredState = () => {
    if (this.laraPhone) {
      const {videoUrl, disableNextButton} = this.state;
      this.laraPhone.post("authoredState", {videoUrl, disableNextButton});
    }
  }

}

// http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
