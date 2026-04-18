/* =========================================================
   쉬운 동영상 만들기 - 메인 JS
   브라우저에서 Canvas + MediaRecorder로 동영상 생성
   ========================================================= */

// ----- 전역 상태 -----
const state = {
  slides: [],          // { id, img(HTMLImageElement), name }
  audioFile: null,     // File
  audioURL: null,
  previewing: false,
  exporting: false,
  stopFlag: false,
};

// ----- DOM 참조 -----
const $ = (id) => document.getElementById(id);
const uploadArea    = $('uploadArea');
const imageInput    = $('imageInput');
const slidesList    = $('slidesList');
const emptyHint     = $('emptyHint');
const durationEl    = $('duration');
const durationValue = $('durationValue');
const transitionEl  = $('transition');
const resolutionEl  = $('resolution');
const fpsEl         = $('fps');
const bgColorEl     = $('bgColor');
const kenBurnsEl    = $('kenBurns');
const audioInput    = $('audioInput');
const audioPreview  = $('audioPreview');
const removeAudio   = $('removeAudio');
const titleText     = $('titleText');
const titleColor    = $('titleColor');
const titlePosition = $('titlePosition');
const titleAllSlides= $('titleAllSlides');
const canvas        = $('previewCanvas');
const ctx           = canvas.getContext('2d');
const previewBtn    = $('previewBtn');
const stopBtn       = $('stopBtn');
const exportBtn     = $('exportBtn');
const progressBox   = $('progressBox');
const progressFill  = $('progressFill');
const progressText  = $('progressText');
const resultBox     = $('resultBox');
const resultVideo   = $('resultVideo');
const downloadLink  = $('downloadLink');

// ----- 초기화 -----
durationValue.textContent = `${durationEl.value}초`;
durationEl.addEventListener('input', () => {
  durationValue.textContent = `${durationEl.value}초`;
});

resolutionEl.addEventListener('change', () => {
  const [w, h] = resolutionEl.value.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
  const wrapper = canvas.parentElement;
  wrapper.style.aspectRatio = `${w} / ${h}`;
  drawIdle();
});

// ----- 이미지 업로드 -----
uploadArea.addEventListener('click', () => imageInput.click());
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  handleImages(files);
});
imageInput.addEventListener('change', (e) => {
  handleImages(Array.from(e.target.files));
  imageInput.value = '';
});

async function handleImages(files) {
  for (const file of files) {
    try {
      const img = await loadImage(file);
      state.slides.push({
        id: crypto.randomUUID(),
        img,
        name: file.name,
      });
    } catch (err) {
      console.warn('이미지 로드 실패:', file.name, err);
    }
  }
  renderSlides();
  drawIdle();
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderSlides() {
  slidesList.innerHTML = '';
  if (state.slides.length === 0) {
    emptyHint.style.display = 'block';
    return;
  }
  emptyHint.style.display = 'none';

  const tmpl = $('slideTemplate');
  state.slides.forEach((slide, idx) => {
    const node = tmpl.content.cloneNode(true);
    const item = node.querySelector('.slide-item');
    const thumb = node.querySelector('.slide-thumb');
    const info = node.querySelector('.slide-idx');
    item.dataset.id = slide.id;
    thumb.src = slide.img.src;
    thumb.alt = slide.name;
    info.textContent = `${idx + 1} / ${state.slides.length}`;

    node.querySelector('.move-left').onclick = () => moveSlide(idx, -1);
    node.querySelector('.move-right').onclick = () => moveSlide(idx, 1);
    node.querySelector('.remove').onclick = () => removeSlide(idx);

    // 드래그 순서 변경
    item.addEventListener('dragstart', (e) => {
      item.classList.add('dragging');
      e.dataTransfer.setData('text/plain', slide.id);
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', (e) => e.preventDefault());
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const srcId = e.dataTransfer.getData('text/plain');
      const srcIdx = state.slides.findIndex(s => s.id === srcId);
      if (srcIdx === -1 || srcIdx === idx) return;
      const [moved] = state.slides.splice(srcIdx, 1);
      state.slides.splice(idx, 0, moved);
      renderSlides();
    });

    slidesList.appendChild(node);
  });
}

function moveSlide(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.slides.length) return;
  [state.slides[idx], state.slides[newIdx]] = [state.slides[newIdx], state.slides[idx]];
  renderSlides();
}

function removeSlide(idx) {
  state.slides.splice(idx, 1);
  renderSlides();
  drawIdle();
}

// ----- 음악 -----
audioInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (state.audioURL) URL.revokeObjectURL(state.audioURL);
  state.audioFile = file;
  state.audioURL = URL.createObjectURL(file);
  audioPreview.src = state.audioURL;
  audioPreview.style.display = 'block';
  removeAudio.style.display = 'inline-flex';
});

removeAudio.addEventListener('click', () => {
  if (state.audioURL) URL.revokeObjectURL(state.audioURL);
  state.audioFile = null;
  state.audioURL = null;
  audioInput.value = '';
  audioPreview.src = '';
  audioPreview.style.display = 'none';
  removeAudio.style.display = 'none';
});

// ----- 캔버스 그리기 -----
function drawIdle() {
  ctx.fillStyle = bgColorEl.value;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.slides.length === 0) {
    ctx.fillStyle = '#ffffff66';
    ctx.font = `${Math.floor(canvas.height / 18)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷 사진을 추가하면 여기에 미리보기가 표시됩니다',
                 canvas.width / 2, canvas.height / 2);
  } else {
    // 첫 사진 표시
    drawSlide(state.slides[0], 0, 1);
    drawTitleOverlay(0);
  }
}

bgColorEl.addEventListener('change', drawIdle);
titleText.addEventListener('input', drawIdle);
titleColor.addEventListener('input', drawIdle);
titlePosition.addEventListener('change', drawIdle);

/**
 * 개별 슬라이드를 canvas에 object-fit: contain 방식으로 그림
 * @param {object} slide
 * @param {number} progress 0~1 (켄 번즈용)
 * @param {number} alpha 0~1 (전환용)
 */
function drawSlide(slide, progress = 0, alpha = 1) {
  const { img } = slide;
  const cw = canvas.width;
  const ch = canvas.height;
  const ir = img.width / img.height;
  const cr = cw / ch;

  let dw, dh;
  if (ir > cr) { dw = cw; dh = cw / ir; }
  else         { dh = ch; dw = ch * ir; }

  let scale = 1;
  let offsetX = 0, offsetY = 0;
  if (kenBurnsEl.checked) {
    // 1.0 -> 1.08 까지 점진 확대
    scale = 1 + 0.08 * progress;
    // 약간의 팬 이동
    offsetX = (Math.sin(progress * Math.PI) - 0.5) * 10;
  }

  const finalW = dw * scale;
  const finalH = dh * scale;
  const dx = (cw - finalW) / 2 + offsetX;
  const dy = (ch - finalH) / 2 + offsetY;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, dx, dy, finalW, finalH);
  ctx.restore();
}

function drawBg() {
  ctx.fillStyle = bgColorEl.value;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTitleOverlay(slideIdx) {
  const text = titleText.value.trim();
  if (!text) return;
  if (!titleAllSlides.checked && slideIdx !== 0) return;

  const fontSize = Math.floor(canvas.height / 16);
  ctx.save();
  ctx.font = `bold ${fontSize}px "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = titleColor.value;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;

  let y;
  const pos = titlePosition.value;
  if (pos === 'top')    y = fontSize * 1.5;
  else if (pos === 'center') y = canvas.height / 2;
  else                  y = canvas.height - fontSize;

  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, y);
  ctx.restore();
}

// ----- 총 길이 계산 -----
function getDurations() {
  const perSlide = parseFloat(durationEl.value);
  const transition = transitionEl.value;
  const transitionDur = transition === 'none' ? 0 : 0.6;
  const n = state.slides.length;
  // 총 시간 = 각 슬라이드 표시시간 합 + 전환 시간 * (n-1)
  // (단, 전환은 슬라이드 표시시간 안에서 겹치게 처리)
  const total = perSlide * n;
  return { perSlide, transitionDur, total, transition };
}

// ----- 프레임 렌더링 (애니메이션 공통 로직) -----
/**
 * 시간 t(초)에 해당하는 프레임을 그림
 */
function renderFrameAt(t) {
  drawBg();
  if (state.slides.length === 0) return;

  const { perSlide, transitionDur, transition } = getDurations();
  const n = state.slides.length;
  const slideIdx = Math.min(Math.floor(t / perSlide), n - 1);
  const localT = t - slideIdx * perSlide;  // 현재 슬라이드에서의 시간
  const progress = localT / perSlide;

  const cw = canvas.width;
  const ch = canvas.height;

  // 기본 현재 슬라이드
  const current = state.slides[slideIdx];

  // 전환 처리: 슬라이드 끝 부분의 transitionDur 동안 다음 슬라이드와 섞음
  if (transition !== 'none' &&
      slideIdx < n - 1 &&
      localT > perSlide - transitionDur) {

    const next = state.slides[slideIdx + 1];
    const tt = (localT - (perSlide - transitionDur)) / transitionDur; // 0~1

    if (transition === 'fade') {
      drawSlide(current, progress, 1 - tt);
      drawSlide(next, 0, tt);
    } else if (transition === 'slide') {
      // 현재: 왼쪽으로 이동 / 다음: 오른쪽에서 진입
      ctx.save();
      ctx.translate(-cw * tt, 0);
      drawSlide(current, progress, 1);
      ctx.restore();
      ctx.save();
      ctx.translate(cw * (1 - tt), 0);
      drawSlide(next, 0, 1);
      ctx.restore();
    } else if (transition === 'zoom') {
      // 현재: 축소 페이드아웃 / 다음: 확대 페이드인
      ctx.save();
      const s1 = 1 + tt * 0.2;
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(s1, s1);
      ctx.translate(-cw / 2, -ch / 2);
      drawSlide(current, progress, 1 - tt);
      ctx.restore();

      ctx.save();
      const s2 = 0.8 + tt * 0.2;
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(s2, s2);
      ctx.translate(-cw / 2, -ch / 2);
      drawSlide(next, 0, tt);
      ctx.restore();
    }
  } else {
    drawSlide(current, progress, 1);
  }

  drawTitleOverlay(slideIdx);
}

// ----- 미리보기 -----
previewBtn.addEventListener('click', () => {
  if (state.slides.length === 0) {
    alert('사진을 먼저 추가해주세요!');
    return;
  }
  if (state.previewing) return;
  startPreview();
});

stopBtn.addEventListener('click', () => {
  state.stopFlag = true;
});

async function startPreview() {
  state.previewing = true;
  state.stopFlag = false;
  previewBtn.disabled = true;
  exportBtn.disabled = true;
  stopBtn.disabled = false;

  // 음악 같이 재생
  if (state.audioURL) {
    audioPreview.currentTime = 0;
    audioPreview.play().catch(() => {});
  }

  const { total } = getDurations();
  const startT = performance.now();

  return new Promise((resolve) => {
    function loop() {
      if (state.stopFlag) {
        audioPreview.pause();
        cleanup();
        resolve();
        return;
      }
      const elapsed = (performance.now() - startT) / 1000;
      if (elapsed >= total) {
        audioPreview.pause();
        renderFrameAt(total - 0.001);
        cleanup();
        resolve();
        return;
      }
      renderFrameAt(elapsed);
      requestAnimationFrame(loop);
    }
    loop();
  });

  function cleanup() {
    state.previewing = false;
    previewBtn.disabled = false;
    exportBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

// ----- 동영상 내보내기 -----
exportBtn.addEventListener('click', async () => {
  if (state.slides.length === 0) {
    alert('사진을 먼저 추가해주세요!');
    return;
  }
  if (state.exporting) return;
  await exportVideo();
});

async function exportVideo() {
  state.exporting = true;
  state.stopFlag = false;
  exportBtn.disabled = true;
  previewBtn.disabled = true;
  stopBtn.disabled = false;
  resultBox.style.display = 'none';
  progressBox.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = '녹화 준비 중...';

  const fps = parseInt(fpsEl.value, 10);
  const { total } = getDurations();

  // Canvas 스트림
  const videoStream = canvas.captureStream(fps);

  // 오디오 병합
  let combinedStream = videoStream;
  let audioCtx = null;
  let audioEl = null;

  if (state.audioURL) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioEl = new Audio(state.audioURL);
      audioEl.crossOrigin = 'anonymous';
      await audioEl.play().catch(() => {}); // 시작
      audioEl.pause();
      audioEl.currentTime = 0;

      const source = audioCtx.createMediaElementSource(audioEl);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      // 스피커로도 (원하면 주석)
      // source.connect(audioCtx.destination);

      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);
    } catch (err) {
      console.warn('오디오 병합 실패, 영상만 저장합니다.', err);
    }
  }

  // MediaRecorder
  const mimeType = pickSupportedMime();
  let recorder;
  try {
    recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 5_000_000,
    });
  } catch (err) {
    alert('이 브라우저에서는 동영상 녹화가 지원되지 않습니다.\n크롬/엣지 최신 버전을 사용해주세요.');
    cleanupExport();
    return;
  }

  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const stopped = new Promise((resolve) => { recorder.onstop = resolve; });

  recorder.start(100);
  progressText.textContent = '녹화 중...';

  // 오디오 재생
  if (audioEl) {
    try { await audioEl.play(); } catch (e) { console.warn(e); }
  }

  // 프레임 렌더링 루프
  const frameInterval = 1000 / fps;
  const startT = performance.now();

  await new Promise((resolve) => {
    function loop() {
      if (state.stopFlag) { resolve(); return; }
      const elapsed = (performance.now() - startT) / 1000;
      if (elapsed >= total) { resolve(); return; }

      renderFrameAt(elapsed);

      const pct = Math.min(100, (elapsed / total) * 100);
      progressFill.style.width = `${pct}%`;
      progressText.textContent = `녹화 중... ${pct.toFixed(0)}%`;

      setTimeout(loop, frameInterval);
    }
    loop();
  });

  // 마지막 프레임 한번 더
  renderFrameAt(total - 0.001);
  await new Promise(r => setTimeout(r, 200));

  recorder.stop();
  if (audioEl) audioEl.pause();
  await stopped;

  if (audioCtx) await audioCtx.close();

  progressText.textContent = '파일 생성 중...';

  const blob = new Blob(chunks, { type: mimeType });
  const url = URL.createObjectURL(blob);
  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';

  resultVideo.src = url;
  downloadLink.href = url;
  downloadLink.download = `my-video-${Date.now()}.${ext}`;
  resultBox.style.display = 'block';
  progressFill.style.width = '100%';
  progressText.textContent = '완료!';

  setTimeout(() => { progressBox.style.display = 'none'; }, 1500);

  resultBox.scrollIntoView({ behavior: 'smooth' });
  cleanupExport();
}

function cleanupExport() {
  state.exporting = false;
  exportBtn.disabled = false;
  previewBtn.disabled = false;
  stopBtn.disabled = true;
}

function pickSupportedMime() {
  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m;
  }
  return 'video/webm';
}

// 초기 렌더
drawIdle();
