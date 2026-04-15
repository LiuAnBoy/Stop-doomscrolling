import { initUI } from "./ui";

const cameraVideo = document.getElementById("camera") as HTMLVideoElement;
const attentionVideo = document.getElementById("attention") as HTMLVideoElement;
const errorEl = document.getElementById("error") as HTMLElement;
const loadingEl = document.getElementById("loading") as HTMLElement;

initUI(cameraVideo, attentionVideo, errorEl, loadingEl);
