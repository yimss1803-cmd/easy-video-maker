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
const uploadPlaceholder = $('uploadPlaceholder');
const uploadLoading = $('uploadLoading');
const loadingText   = $('loadingText');
const imageInput    = $('imageInput');
const slidesList    = $('slidesList');
const emptyHint     = $('emptyHint');
const slideCount    = $('slideCount');
const slidesActions = $('slidesActions');
const clearAllBtn   = $('clearAllBtn');
const totalDuration = $('totalDuration');
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
  updateSlideInfo();
});

// 전체 삭제 버튼
clearAllBtn.addEventListener('click', () => {
  if (state.slides.length === 0) return;
  if (confirm(`${state.slides.length}장의 사진을 모두 삭제하시겠어요?`)) {
    state.slides = [];
    renderSlides();
    drawIdle();
    showToast('🗑 모든 사진을 삭제했어요.', 'info');
  }
});

// ============================================================
// 🎨 스마트 프리셋
// ============================================================

/**
 * 프리셋 정의
 * - transition: 기본 전환 효과
 * - transitionPool: 랜덤으로 돌아가면서 사용할 전환 풀 (선택)
 * - kenBurns: 켄번즈 효과 on/off
 * - bgColor: 배경색
 * - description: 설명
 */
const PRESETS = {
  car: {
    name: '🚗 차 변신',
    transition: 'motionblur',
    transitionPool: ['motionblur', 'morph', 'motionblur', 'warp'],
    kenBurns: true,
    bgColor: '#0a0a0a',
    description: '차량이 달리면서 자연스럽게 변신하는 효과',
  },
  travel: {
    name: '✈️ 여행 추억',
    transition: 'fade',
    transitionPool: ['fade', 'zoom', 'fade', 'circle'],
    kenBurns: true,
    bgColor: '#1a1a2e',
    description: '부드러운 페이드와 켄번즈로 추억을 아련하게',
  },
  birthday: {
    name: '🎂 생일/파티',
    transition: 'flash',
    transitionPool: ['flash', 'zoom', 'flash', 'slide'],
    kenBurns: true,
    bgColor: '#2d1b3d',
    description: '번쩍이는 플래시와 활기찬 줌인',
  },
  wedding: {
    name: '💍 웨딩/감성',
    transition: 'circle',
    transitionPool: ['circle', 'fade', 'circle', 'zoom'],
    kenBurns: true,
    bgColor: '#2a1f1f',
    description: '원형 마스크로 로맨틱하게',
  },
  scifi: {
    name: '🤖 SF/게임',
    transition: 'glitch',
    transitionPool: ['glitch', 'pixelate', 'glitch', 'warp'],
    kenBurns: false,
    bgColor: '#000000',
    description: '디지털 왜곡과 픽셀 디졸브',
  },
  morph: {
    name: '✨ 변신 쇼',
    transition: 'morph',
    transitionPool: ['morph', 'warp', 'morph', 'pixelate'],
    kenBurns: true,
    bgColor: '#0f0f1e',
    description: '부드러운 모프 블렌드와 고무같은 워프',
  },
  sports: {
    name: '⚽ 스포츠',
    transition: 'motionblur',
    transitionPool: ['motionblur', 'glitch', 'flash', 'slide'],
    kenBurns: true,
    bgColor: '#0d1f0d',
    description: '역동적인 모션블러와 번쩍이는 플래시',
  },
  pet: {
    name: '🐶 반려동물',
    transition: 'zoom',
    transitionPool: ['zoom', 'fade', 'circle', 'zoom'],
    kenBurns: true,
    bgColor: '#1e1a0e',
    description: '귀여운 줌인과 페이드',
  },
  random: {
    name: '🎲 랜덤 믹스',
    transition: 'fade',
    transitionPool: ['fade', 'morph', 'motionblur', 'warp', 'pixelate', 'glitch', 'flash', 'circle', 'zoom', 'slide'],
    kenBurns: true,
    bgColor: '#000000',
    description: '매번 다른 전환 효과로 재미있게',
  },
};

/**
 * 프리셋 적용 - 사진 갯수에 맞춰 목표 시간을 균등 분배
 */
function applyPreset(presetKey) {
  const preset = PRESETS[presetKey];
  if (!preset) return;

  if (state.slides.length < 2) {
    showToast('⚠️ 프리셋을 적용하려면 <strong>사진을 2장 이상</strong> 먼저 추가해주세요!', 'warn');
    return;
  }

  // 목표 시간 (초)
  const targetDuration = parseInt($('presetDuration').value, 10);
  const n = state.slides.length;

  // 각 슬라이드 시간 계산 (소수 첫째자리로 반올림)
  let perSlide = targetDuration / n;
  // 너무 짧거나 길지 않게 제한 (1초 ~ 10초)
  perSlide = Math.max(1, Math.min(10, perSlide));
  // 슬라이더에 맞게 0.5초 단위로 반올림
  perSlide = Math.round(perSlide * 2) / 2;

  // 시간 설정 업데이트
  durationEl.value = perSlide;
  durationValue.textContent = `${perSlide}초`;

  // 전환 효과 설정
  transitionEl.value = preset.transition;

  // 켄번즈 설정
  kenBurnsEl.checked = preset.kenBurns;

  // 배경색 설정
  bgColorEl.value = preset.bgColor;

  // 랜덤/풀 전환: slide별로 다른 전환 효과를 저장해두고 렌더링에 활용
  if (preset.transitionPool && preset.transitionPool.length > 1) {
    state.transitionOverrides = {};
    for (let i = 0; i < n - 1; i++) {
      if (presetKey === 'random') {
        // 완전 랜덤
        const pool = preset.transitionPool;
        state.transitionOverrides[i] = pool[Math.floor(Math.random() * pool.length)];
      } else {
        // 순환 패턴 (좀 더 예측 가능)
        state.transitionOverrides[i] = preset.transitionPool[i % preset.transitionPool.length];
      }
    }
  } else {
    state.transitionOverrides = null;
  }

  updateSlideInfo();
  drawIdle();

  // 예상 길이 계산
  const actualTotal = perSlide * n;
  const min = Math.floor(actualTotal / 60);
  const sec = Math.round(actualTotal % 60);
  const timeStr = min > 0 ? `${min}분 ${sec}초` : `${sec}초`;

  showToast(
    `✅ <strong>${preset.name}</strong> 프리셋 적용!<br>
     <small>• ${preset.description}<br>
     • 사진 ${n}장 × ${perSlide}초 = <strong>${timeStr}</strong><br>
     ${preset.transitionPool ? `• 전환효과: ${preset.transitionPool.length}가지 순환` : ''}</small>`,
    'success'
  );
}

// 프리셋 버튼 이벤트 바인딩
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = btn.dataset.preset;
    // 선택 효과
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyPreset(preset);
  });
});

// 목표 시간 변경 시 현재 프리셋 재적용
$('presetDuration').addEventListener('change', () => {
  const activeBtn = document.querySelector('.preset-btn.active');
  if (activeBtn) {
    applyPreset(activeBtn.dataset.preset);
  }
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
const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

uploadArea.addEventListener('click', () => imageInput.click());
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files);
  handleImages(files);
});
imageInput.addEventListener('change', (e) => {
  handleImages(Array.from(e.target.files));
  imageInput.value = '';
});

/**
 * 토스트 알림 표시
 */
function showToast(message, type = 'info') {
  // 기존 토스트 제거
  const old = document.getElementById('toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = `toast toast-${type}`;
  toast.innerHTML = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

/**
 * HEIC/HEIF 파일인지 판별
 */
function isHeic(file) {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif')
      || type.includes('heic') || type.includes('heif');
}

/**
 * HEIC → JPEG 변환 (heic2any 라이브러리 사용)
 */
async function convertHeic(file) {
  if (typeof heic2any === 'undefined') {
    throw new Error('HEIC 변환 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하거나 JPG로 변환 후 다시 시도해주세요.');
  }
  const blob = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  });
  // heic2any는 blob 혹은 blob[]을 반환할 수 있음
  const finalBlob = Array.isArray(blob) ? blob[0] : blob;
  // File-like 만들기 (name 보존)
  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([finalBlob], newName, { type: 'image/jpeg' });
}

function showLoading(text) {
  uploadPlaceholder.style.display = 'none';
  uploadLoading.style.display = 'flex';
  loadingText.textContent = text;
}
function hideLoading() {
  uploadPlaceholder.style.display = 'block';
  uploadLoading.style.display = 'none';
}

async function handleImages(files) {
  if (!files || files.length === 0) {
    showToast('⚠️ 선택된 파일이 없습니다.', 'warn');
    return;
  }

  const results = { success: 0, failed: [], skipped: [] };
  const total = files.length;

  showLoading(`사진 처리 중... (0/${total})`);

  try {
    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      const fileName = file.name || '알 수 없는 파일';
      const fileType = (file.type || '').toLowerCase();
      const fileExt = fileName.split('.').pop().toLowerCase();

      loadingText.textContent = `사진 처리 중... (${i + 1}/${total}) - ${fileName}`;

      // HEIC 자동 변환
      if (isHeic(file)) {
        try {
          loadingText.textContent = `HEIC 변환 중... (${i + 1}/${total}) - ${fileName}`;
          file = await convertHeic(file);
        } catch (err) {
          console.error('HEIC 변환 실패:', fileName, err);
          results.failed.push({
            name: fileName,
            reason: 'HEIC 변환 실패: ' + (err?.message || '알 수 없는 오류')
          });
          continue;
        }
      } else if (!fileType.startsWith('image/') && !['jpg','jpeg','png','webp','gif','bmp'].includes(fileExt)) {
        results.skipped.push({
          name: fileName,
          reason: `이미지 파일이 아닙니다 (${fileType || fileExt || '알 수 없는 형식'})`
        });
        continue;
      }

      // 크기 검증
      if (file.size > MAX_FILE_SIZE) {
        results.skipped.push({
          name: fileName,
          reason: `파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB). 50MB 이하만 업로드 가능해요.`
        });
        continue;
      }

      if (file.size === 0) {
        results.skipped.push({ name: fileName, reason: '빈 파일입니다.' });
        continue;
      }

      // 이미지 로드 시도
      try {
        const img = await loadImage(file);
        state.slides.push({
          id: (crypto.randomUUID && crypto.randomUUID()) || ('id_' + Date.now() + '_' + Math.random()),
          img,
          name: fileName,
        });
        results.success++;
      } catch (err) {
        console.error('이미지 로드 실패:', fileName, err);
        results.failed.push({
          name: fileName,
          reason: err?.message || '알 수 없는 오류'
        });
      }
    }
  } finally {
    hideLoading();
  }

  renderSlides();
  drawIdle();

  // 결과 요약 표시
  if (results.success > 0 && results.failed.length === 0 && results.skipped.length === 0) {
    showToast(`✅ ${results.success}장의 사진을 추가했어요!`, 'success');
  } else {
    let msg = '';
    if (results.success > 0) msg += `✅ 성공: ${results.success}장<br>`;
    if (results.failed.length > 0) {
      msg += `❌ 실패: ${results.failed.length}장<br>`;
      results.failed.slice(0, 3).forEach(f => {
        msg += `<small>• ${f.name}: ${f.reason}</small><br>`;
      });
    }
    if (results.skipped.length > 0) {
      msg += `⚠️ 건너뜀: ${results.skipped.length}장<br>`;
      results.skipped.slice(0, 3).forEach(s => {
        msg += `<small>• ${s.name}<br>&nbsp;&nbsp;→ ${s.reason}</small><br>`;
      });
    }
    showToast(msg, results.success > 0 ? 'warn' : 'error');
  }
}

/**
 * 이미지 로드 - createObjectURL 방식 (FileReader보다 안정적, 큰 파일도 OK)
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) {
      reject(new Error('유효하지 않은 파일 객체'));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    const cleanup = () => {
      // 이미지 로드가 끝나도 drawImage에 쓰려면 URL이 필요할 수 있지만
      // img.src가 설정되면 브라우저가 내부적으로 캐시하므로 revoke해도 됨.
      // 단, 일부 브라우저에서 이슈가 있을 수 있어 약간 지연 후 revoke
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('이미지 로드 시간 초과 (30초). 파일이 너무 크거나 손상됐을 수 있어요.'));
    }, 30000);

    img.onload = () => {
      clearTimeout(timeout);
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        cleanup();
        reject(new Error('이미지 크기가 0입니다. 손상된 파일일 수 있어요.'));
        return;
      }
      // URL을 유지해서 나중에 canvas drawing에도 사용할 수 있도록 revoke 지연
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      resolve(img);
    };

    img.onerror = (e) => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('이미지 디코딩 실패. 지원하지 않는 형식이거나 손상된 파일입니다.'));
    };

    img.src = url;
  });
}

function updateSlideInfo() {
  const n = state.slides.length;
  if (n === 0) {
    slideCount.style.display = 'none';
    slidesActions.style.display = 'none';
  } else {
    slideCount.style.display = 'inline-block';
    slideCount.textContent = `${n}장`;
    slidesActions.style.display = 'flex';

    // 러닝타임 계산
    const perSlide = parseFloat(durationEl.value);
    const totalSec = perSlide * n;
    const min = Math.floor(totalSec / 60);
    const sec = Math.round(totalSec % 60);
    const timeStr = min > 0 ? `${min}분 ${sec}초` : `${sec}초`;
    totalDuration.textContent = `⏱ 예상 길이: ${timeStr}`;
  }
}

function renderSlides() {
  slidesList.innerHTML = '';
  updateSlideInfo();
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

// 전환효과를 수동으로 바꾸면 프리셋 override 해제
transitionEl.addEventListener('change', () => {
  state.transitionOverrides = null;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
});

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
/**
 * 전환 효과별 지속 시간 (초)
 */
function getTransitionDuration(transition) {
  const table = {
    'none': 0,
    'fade': 0.6,
    'slide': 0.6,
    'zoom': 0.6,
    'morph': 1.0,       // 변신은 길게
    'motionblur': 0.7,
    'warp': 0.8,
    'pixelate': 0.8,
    'glitch': 0.5,
    'flash': 0.4,
    'circle': 0.7,
  };
  return table[transition] ?? 0.6;
}

function getDurations() {
  const perSlide = parseFloat(durationEl.value);
  const transition = transitionEl.value;
  const transitionDur = getTransitionDuration(transition);
  const n = state.slides.length;
  const total = perSlide * n;
  return { perSlide, transitionDur, total, transition };
}

// ----- 프레임 렌더링 (애니메이션 공통 로직) -----
/**
 * easeInOutCubic — 부드러운 이징
 */
function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * 시간 t(초)에 해당하는 프레임을 그림
 */
function renderFrameAt(t) {
  drawBg();
  if (state.slides.length === 0) return;

  const { perSlide } = getDurations();
  const n = state.slides.length;
  const slideIdx = Math.min(Math.floor(t / perSlide), n - 1);
  const localT = t - slideIdx * perSlide;
  const progress = localT / perSlide;

  // 이 슬라이드의 전환효과 결정 (프리셋 override > 전역 설정)
  let transition = transitionEl.value;
  if (state.transitionOverrides && state.transitionOverrides[slideIdx] !== undefined) {
    transition = state.transitionOverrides[slideIdx];
  }
  const transitionDur = getTransitionDuration(transition);

  const current = state.slides[slideIdx];

  // 전환 처리
  if (transition !== 'none' &&
      slideIdx < n - 1 &&
      localT > perSlide - transitionDur) {

    const next = state.slides[slideIdx + 1];
    const ttRaw = (localT - (perSlide - transitionDur)) / transitionDur; // 0~1
    const tt = ease(ttRaw);

    drawTransition(transition, current, next, progress, tt, ttRaw);
  } else {
    drawSlide(current, progress, 1);
  }

  drawTitleOverlay(slideIdx);
}

/**
 * 전환 효과별 렌더링
 * @param {string} type 전환 타입
 * @param {object} current 현재 슬라이드
 * @param {object} next 다음 슬라이드
 * @param {number} progress 현재 슬라이드 내 진행도 (0~1)
 * @param {number} tt 이징 적용된 전환 진행도 (0~1)
 * @param {number} ttRaw 원본 전환 진행도 (0~1)
 */
function drawTransition(type, current, next, progress, tt, ttRaw) {
  const cw = canvas.width;
  const ch = canvas.height;

  switch (type) {
    case 'fade':
      drawSlide(current, progress, 1 - tt);
      drawSlide(next, 0, tt);
      break;

    case 'slide':
      ctx.save();
      ctx.translate(-cw * tt, 0);
      drawSlide(current, progress, 1);
      ctx.restore();
      ctx.save();
      ctx.translate(cw * (1 - tt), 0);
      drawSlide(next, 0, 1);
      ctx.restore();
      break;

    case 'zoom':
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
      break;

    case 'morph': {
      // 🌊 모프 블렌드: 블러 + 살짝 줌 + 색상 블렌드 = 변신 느낌
      const blurAmount = Math.sin(tt * Math.PI) * 12; // 가운데에서 블러 최대
      const currentScale = 1 + tt * 0.08;
      const nextScale = 1.08 - tt * 0.08;

      ctx.save();
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(currentScale, currentScale);
      ctx.translate(-cw / 2, -ch / 2);
      drawSlide(current, progress, 1 - tt);
      ctx.restore();

      ctx.save();
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(nextScale, nextScale);
      ctx.translate(-cw / 2, -ch / 2);
      // 블렌드 모드로 변신 느낌 강화
      ctx.globalCompositeOperation = tt < 0.5 ? 'source-over' : 'lighter';
      drawSlide(next, 0, tt);
      ctx.restore();
      break;
    }

    case 'motionblur': {
      // 💨 모션 블러: 옆으로 흐르면서 여러 겹 잔상 (달리는 느낌)
      const blurOffset = tt * cw * 0.3;
      // 현재 이미지: 왼쪽으로 번지며 사라짐
      ctx.save();
      ctx.globalAlpha = 1 - tt;
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.globalAlpha = (1 - tt) / (i + 1);
        ctx.translate(-blurOffset * (i / 4), 0);
        drawSlide(current, progress, 1);
        ctx.restore();
      }
      ctx.restore();
      // 다음 이미지: 오른쪽에서 번지며 등장
      ctx.save();
      ctx.globalAlpha = tt;
      const inOffset = (1 - tt) * cw * 0.3;
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.globalAlpha = tt / (i + 1);
        ctx.translate(inOffset * (i / 4), 0);
        drawSlide(next, 0, 1);
        ctx.restore();
      }
      ctx.restore();
      break;
    }

    case 'warp': {
      // 🔄 워프: 수평 늘어짐 + 블렌드
      ctx.save();
      const currentStretchX = 1 + tt * 2;    // 현재: 옆으로 늘어남
      const currentStretchY = 1 - tt * 0.3;
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(currentStretchX, currentStretchY);
      ctx.translate(-cw / 2, -ch / 2);
      ctx.globalAlpha = 1 - tt;
      drawSlide(current, progress, 1);
      ctx.restore();

      ctx.save();
      const nextStretchX = 3 - tt * 2;    // 다음: 늘어진 상태에서 복원
      const nextStretchY = 0.7 + tt * 0.3;
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(nextStretchX, nextStretchY);
      ctx.translate(-cw / 2, -ch / 2);
      ctx.globalAlpha = tt;
      drawSlide(next, 0, 1);
      ctx.restore();
      break;
    }

    case 'pixelate': {
      // 🌀 픽셀 디졸브: 픽셀 크게 → 페이드 → 픽셀 다시 작게
      // 가운데에서 픽셀이 최대로 커짐
      const pxSize = 1 + Math.sin(tt * Math.PI) * 40;

      // 오프스크린 캔버스로 픽셀화
      if (!state._offCanvas) {
        state._offCanvas = document.createElement('canvas');
      }
      const off = state._offCanvas;
      off.width = canvas.width;
      off.height = canvas.height;
      const offCtx = off.getContext('2d');

      // 먼저 합쳐진 이미지를 off에 그림
      offCtx.clearRect(0, 0, off.width, off.height);
      drawSlideTo(offCtx, current, progress, 1 - tt);
      drawSlideTo(offCtx, next, 0, tt);

      // 저해상도로 축소 후 다시 확대 = 픽셀 효과
      if (pxSize > 1.5) {
        const smallW = Math.max(1, Math.floor(cw / pxSize));
        const smallH = Math.max(1, Math.floor(ch / pxSize));
        const small = document.createElement('canvas');
        small.width = smallW; small.height = smallH;
        const sCtx = small.getContext('2d');
        sCtx.imageSmoothingEnabled = false;
        sCtx.drawImage(off, 0, 0, smallW, smallH);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(small, 0, 0, cw, ch);
        ctx.imageSmoothingEnabled = true;
      } else {
        ctx.drawImage(off, 0, 0);
      }
      break;
    }

    case 'glitch': {
      // ⚡ 글리치: RGB 분리 + 랜덤 슬라이스 어긋남
      // 기본 레이어: 페이드
      drawSlide(current, progress, 1 - tt);
      drawSlide(next, 0, tt);

      // 랜덤 슬라이스 shift (글리치 효과)
      const glitchIntensity = Math.sin(tt * Math.PI) * 30;
      const slices = 6;
      const sliceH = ch / slices;

      for (let i = 0; i < slices; i++) {
        if (Math.random() < 0.4) {
          const offset = (Math.random() - 0.5) * glitchIntensity;
          // 해당 슬라이스만 좌우로 흔들기
          const srcY = i * sliceH;
          try {
            const imgData = ctx.getImageData(0, srcY, cw, sliceH);
            ctx.putImageData(imgData, offset, srcY);
          } catch (e) {
            // CORS-safe이어야 하므로 무시
          }
        }
      }

      // RGB 분리 느낌 (얇은 컬러 오버레이)
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255, 0, 80, ${0.15 * Math.sin(tt * Math.PI)})`;
      ctx.fillRect(Math.sin(tt * 30) * 8, 0, cw, ch);
      ctx.fillStyle = `rgba(0, 200, 255, ${0.15 * Math.sin(tt * Math.PI)})`;
      ctx.fillRect(-Math.sin(tt * 30) * 8, 0, cw, ch);
      ctx.restore();
      break;
    }

    case 'flash': {
      // 💥 플래시 컷: 0~0.3 현재 페이드아웃 / 0.3~0.5 흰 플래시 / 0.5~1 다음 등장
      if (ttRaw < 0.5) {
        drawSlide(current, progress, 1);
        // 흰색 플래시 점점 강해짐
        ctx.save();
        const flashAlpha = ttRaw * 2;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, cw, ch);
        ctx.restore();
      } else {
        drawSlide(next, 0, 1);
        // 플래시 사라짐
        ctx.save();
        const flashAlpha = (1 - ttRaw) * 2;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, cw, ch);
        ctx.restore();
      }
      break;
    }

    case 'circle': {
      // ⭕ 원형 마스크: 다음 이미지가 중앙에서 원형으로 열림
      drawSlide(current, progress, 1);

      ctx.save();
      const maxR = Math.sqrt(cw * cw + ch * ch) / 2;
      const r = maxR * tt;
      ctx.beginPath();
      ctx.arc(cw / 2, ch / 2, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      drawSlide(next, 0, 1);
      ctx.restore();

      // 원 가장자리에 빛나는 링
      if (r > 0 && r < maxR) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - tt})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cw / 2, ch / 2, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }

    default:
      drawSlide(current, progress, 1 - tt);
      drawSlide(next, 0, tt);
  }
}

/**
 * 지정된 ctx에 슬라이드 그리기 (픽셀 효과용)
 */
function drawSlideTo(targetCtx, slide, progress, alpha) {
  const { img } = slide;
  const cw = canvas.width;
  const ch = canvas.height;
  const ir = img.width / img.height;
  const cr = cw / ch;
  let dw, dh;
  if (ir > cr) { dw = cw; dh = cw / ir; }
  else         { dh = ch; dw = ch * ir; }

  let scale = 1;
  if (kenBurnsEl.checked) scale = 1 + 0.08 * progress;
  const finalW = dw * scale;
  const finalH = dh * scale;
  const dx = (cw - finalW) / 2;
  const dy = (ch - finalH) / 2;

  targetCtx.save();
  targetCtx.globalAlpha = alpha;
  targetCtx.drawImage(img, dx, dy, finalW, finalH);
  targetCtx.restore();
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

// ============================================================
// ✨ AI 변신 모드
// ============================================================

const aiModal = $('aiModal');
const aiMorphBtn = $('aiMorphBtn');
const aiModalClose = $('aiModalClose');
const aiCancelBtn = $('aiCancelBtn');
const aiGenerateBtn = $('aiGenerateBtn');
const aiPairSelect = $('aiPairSelect');
const aiProvider = $('aiProvider');
const aiApiKey = $('aiApiKey');
const aiPrompt = $('aiPrompt');
const aiDuration = $('aiDuration');
const aiProgress = $('aiProgress');
const aiProgressText = $('aiProgressText');
const aiProgressHint = $('aiProgressHint');
const aiResult = $('aiResult');
const aiResultVideo = $('aiResultVideo');
const aiDownloadLink = $('aiDownloadLink');
const aiNewBtn = $('aiNewBtn');

// localStorage에서 API 키 복원
if (localStorage.getItem('aiApiKey')) {
  aiApiKey.value = localStorage.getItem('aiApiKey');
}
if (localStorage.getItem('aiProvider')) {
  aiProvider.value = localStorage.getItem('aiProvider');
}

function openAiModal() {
  if (state.slides.length < 2) {
    showToast('⚠️ AI 변신 모드는 <strong>2장 이상의 사진</strong>이 필요합니다.', 'warn');
    return;
  }
  // 이미지 쌍 드롭다운 업데이트
  aiPairSelect.innerHTML = '<option value="">-- 이미지 쌍을 선택하세요 --</option>';
  for (let i = 0; i < state.slides.length - 1; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${i + 1}번 → ${i + 2}번 (${state.slides[i].name} → ${state.slides[i + 1].name})`;
    aiPairSelect.appendChild(opt);
  }
  if (state.slides.length >= 2) aiPairSelect.value = '0';

  aiModal.style.display = 'flex';
  aiResult.style.display = 'none';
  aiProgress.style.display = 'none';
  document.body.style.overflow = 'hidden';
}

function closeAiModal() {
  aiModal.style.display = 'none';
  document.body.style.overflow = '';
}

aiMorphBtn.addEventListener('click', openAiModal);
aiModalClose.addEventListener('click', closeAiModal);
aiCancelBtn.addEventListener('click', closeAiModal);
aiModal.querySelector('.modal-backdrop').addEventListener('click', closeAiModal);

aiNewBtn.addEventListener('click', () => {
  aiResult.style.display = 'none';
  aiProgress.style.display = 'none';
});

/**
 * Canvas에서 이미지를 Blob으로 변환
 */
function slideToBlob(slide, mimeType = 'image/jpeg', quality = 0.92) {
  return new Promise((resolve, reject) => {
    const off = document.createElement('canvas');
    off.width = slide.img.naturalWidth;
    off.height = slide.img.naturalHeight;
    const offCtx = off.getContext('2d');
    offCtx.drawImage(slide.img, 0, 0);
    off.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Blob 변환 실패')),
      mimeType,
      quality
    );
  });
}

/**
 * AI 영상 생성 — 서비스별 라우팅
 */
async function generateAiMorph() {
  const pairIdx = parseInt(aiPairSelect.value, 10);
  if (isNaN(pairIdx)) {
    showToast('⚠️ 이미지 쌍을 선택해주세요.', 'warn');
    return;
  }
  const apiKey = aiApiKey.value.trim();
  if (!apiKey) {
    showToast('⚠️ API 키를 입력해주세요.', 'warn');
    return;
  }

  // 저장
  localStorage.setItem('aiApiKey', apiKey);
  localStorage.setItem('aiProvider', aiProvider.value);

  const startSlide = state.slides[pairIdx];
  const endSlide = state.slides[pairIdx + 1];
  const prompt = aiPrompt.value.trim() ||
    `Smooth morphing transition from first image to second image, cinematic, high quality`;
  const duration = parseInt(aiDuration.value, 10);
  const provider = aiProvider.value;

  // UI 상태
  aiResult.style.display = 'none';
  aiProgress.style.display = 'flex';
  aiGenerateBtn.disabled = true;
  aiProgressText.textContent = '이미지 준비 중...';
  aiProgressHint.textContent = '이 창을 닫지 마세요.';

  try {
    // 이미지를 Blob으로 변환
    const [startBlob, endBlob] = await Promise.all([
      slideToBlob(startSlide),
      slideToBlob(endSlide),
    ]);

    aiProgressText.textContent = 'AI 서비스에 요청 중...';

    let videoUrl;
    if (provider === 'fal') {
      videoUrl = await generateViaFal(apiKey, startBlob, endBlob, prompt, duration);
    } else if (provider === 'replicate') {
      videoUrl = await generateViaReplicate(apiKey, startBlob, endBlob, prompt, duration);
    } else if (provider === 'runway') {
      videoUrl = await generateViaRunway(apiKey, startBlob, endBlob, prompt, duration);
    } else {
      throw new Error('아직 지원되지 않는 서비스입니다. fal.ai를 사용해보세요.');
    }

    // 결과 표시
    aiResultVideo.src = videoUrl;
    aiDownloadLink.href = videoUrl;
    aiDownloadLink.download = `ai-morph-${Date.now()}.mp4`;
    aiProgress.style.display = 'none';
    aiResult.style.display = 'block';
    showToast('✅ AI 변신 영상이 완성됐어요!', 'success');

  } catch (err) {
    console.error('AI 변신 실패:', err);
    aiProgress.style.display = 'none';
    showToast(`❌ AI 변신 실패<br><small>${err.message || err}</small>`, 'error');
  } finally {
    aiGenerateBtn.disabled = false;
  }
}

aiGenerateBtn.addEventListener('click', generateAiMorph);

/**
 * fal.ai - Kling v1.6 pro / Luma 같은 모델로 first-last frame 영상 생성
 * 참고: https://fal.ai/models (kling-video, luma-dream-machine 등)
 */
async function generateViaFal(apiKey, startBlob, endBlob, prompt, duration) {
  aiProgressText.textContent = '이미지 업로드 중 (fal.ai)...';

  // 1) 이미지 업로드
  const startUrl = await falUploadBlob(apiKey, startBlob);
  const endUrl = await falUploadBlob(apiKey, endBlob);

  aiProgressText.textContent = 'AI 영상 생성 요청 중...';

  // 2) kling 1.6 pro (first-last) 모델 호출
  const submitRes = await fetch('https://queue.fal.run/fal-ai/kling-video/v1.6/pro/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_url: startUrl,
      tail_image_url: endUrl,
      duration: duration >= 8 ? '10' : '5',
      aspect_ratio: '16:9',
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`fal.ai 요청 실패 (${submitRes.status}): ${errText.slice(0, 200)}`);
  }

  const submitData = await submitRes.json();
  const requestId = submitData.request_id;

  if (!requestId) {
    throw new Error('fal.ai request_id가 없습니다. 응답: ' + JSON.stringify(submitData).slice(0, 200));
  }

  aiProgressText.textContent = 'AI가 영상을 생성 중입니다...';
  aiProgressHint.textContent = '약 1~3분 소요됩니다. 기다려주세요.';

  // 3) 폴링
  const statusUrl = `https://queue.fal.run/fal-ai/kling-video/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/fal-ai/kling-video/requests/${requestId}`;

  let attempts = 0;
  const maxAttempts = 120; // 6분

  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 3000));
    attempts++;

    const statusRes = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${apiKey}` },
    });
    if (!statusRes.ok) continue;
    const status = await statusRes.json();

    aiProgressText.textContent = `AI 생성 중... (${attempts * 3}초 경과)`;

    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(resultUrl, {
        headers: { 'Authorization': `Key ${apiKey}` },
      });
      const result = await resultRes.json();
      const videoUrl = result?.video?.url || result?.data?.video?.url;
      if (!videoUrl) {
        throw new Error('영상 URL을 찾을 수 없습니다. 결과: ' + JSON.stringify(result).slice(0, 200));
      }
      return videoUrl;
    }

    if (status.status === 'FAILED' || status.status === 'ERROR') {
      throw new Error('AI 생성 실패: ' + (status.error || JSON.stringify(status)));
    }
  }

  throw new Error('시간 초과 (6분). 잠시 후 다시 시도해주세요.');
}

async function falUploadBlob(apiKey, blob) {
  // fal storage API로 업로드
  const initRes = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_name: `image_${Date.now()}.jpg`,
      content_type: blob.type || 'image/jpeg',
    }),
  });
  if (!initRes.ok) throw new Error('fal 업로드 초기화 실패');
  const initData = await initRes.json();

  const putRes = await fetch(initData.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': blob.type || 'image/jpeg' },
    body: blob,
  });
  if (!putRes.ok) throw new Error('fal 이미지 업로드 실패');

  return initData.file_url;
}

/**
 * Replicate - 간단히 안내만 (CORS 이슈로 직접 호출 제한)
 */
async function generateViaReplicate(apiKey, startBlob, endBlob, prompt, duration) {
  throw new Error('Replicate는 CORS 정책으로 브라우저에서 직접 호출이 막혀있어요. fal.ai를 사용하거나 별도 프록시 서버가 필요합니다.');
}

/**
 * Runway ML - 동일
 */
async function generateViaRunway(apiKey, startBlob, endBlob, prompt, duration) {
  throw new Error('Runway는 브라우저 직접 호출을 막아두었어요. fal.ai를 사용하거나 별도 프록시 서버가 필요합니다.');
}

// 초기 렌더
drawIdle();
