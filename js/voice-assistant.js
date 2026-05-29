/**
 * Giọng nói — Plan A: Web Speech API.
 * Spec: Voice_check.md — giữ VOICE_VOCAB đồng bộ khi đổi alias / lệnh.
 */
(function () {
  'use strict';

  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  /** Đồng bộ với Voice_check.md §1–§2 */
  var VOICE_VOCAB = {
    version: '1.1',
    aliases: [
      ['xuong vang', ' XV '],
      ['xuồng vàng', ' XV '],
      ['xuong do', ' XD '],
      ['xuồng đỏ', ' XD '],
      ['xuong tim', ' XT '],
      ['xuồng tím', ' XT '],
      ['cao xanh', ' CX '],
      ['cào xanh', ' CX '],
      ['cao cao xanh', ' CC '],
      ['cào cào xanh', ' CC '],
      ['do moi', ' DM '],
      ['đỏ mới', ' DM '],
      ['vex hong', ' VH '],
      ['ve hong', ' VH '],
      ['vê hồng', ' VH '],
      ['do rip', ' D '],
      ['đờ ríp', ' D '],
    ],
    aliasPatterns: [
      [/\bxuong\s+(\d+)\b/g, ' X$1 '],
      [/\bxuồng\s+(\d+)\b/g, ' X$1 '],
      [/\bcao\s+(\d+)\b/g, ' C$1 '],
      [/\bcào\s+(\d+)\b/g, ' C$1 '],
      [/\bcào\s+cào\s+xanh\b/g, ' CC '],
      [/\bcao\s+cao\s+xanh\b/g, ' CC '],
    ],
    keywords: {
      add_car: [' ra', ' ra roi', ' ra rồi', ' roi', ' rồi'],
      check_in: [' vao', ' vào', ' cho vao', ' cho vào'],
      change_car: [' qua ', ' doi ', ' đổi ', ' chuyen ', ' chuyển ', ' doi xe ', ' đổi xe '],
      swap_hint: [' qua ', ' doi ', ' đổi '],
      paid_true: [' ra roi', ' ra rồi', ' rồi', ' roi', ' thanh toan', ' da tra'],
      paid_false: [' chua', ' chưa', ' chua tra'],
      resume: ['res', 'tiep tuc', 'tiếp tục'],
      delete: ['xoa', 'delete'],
    },
  };

  function normalizeText(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeCode(code) {
    return String(code || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function applyAliases(t) {
    var out = ' ' + t + ' ';
    VOICE_VOCAB.aliasPatterns.forEach(function (pair) {
      out = out.replace(pair[0], pair[1]);
    });
    var list = VOICE_VOCAB.aliases.slice().sort(function (a, b) {
      return b[0].length - a[0].length;
    });
    list.forEach(function (pair) {
      var from = normalizeText(pair[0]);
      var to = pair[1];
      if (!from) return;
      out = out.split(from).join(to);
    });
    return out.replace(/\s+/g, ' ').trim();
  }

  /** Trích mã chuẩn sau bước alias */
  function extractCarCodes(text) {
    var norm = applyAliases(normalizeText(text));
    var found = [];
    var re = /\b([a-z]{1,2}\d{1,4}|[a-z]{2})\b/gi;
    var m;
    while ((m = re.exec(norm)) !== null) {
      var c = normalizeCode(m[1]);
      if (!c) continue;
      if (/^(RA|ROI|VAO|QUA|DOI|XE|CHUA|CHUYEN)$/.test(c)) continue;
      if (found.indexOf(c) === -1) found.push(c);
    }
    var reNum = /\b(\d{2,3})\b/g;
    while ((m = reNum.exec(norm)) !== null) {
      c = normalizeCode(m[1]);
      if (found.indexOf(c) === -1) found.push(c);
    }
    return found;
  }

  function detectPaidFlag(t, action) {
    if (action !== 'add_car') return undefined;
    if (/\b(ra roi|ra rồi)\b/.test(t) || /\brồi\b/.test(t) || /\broi\b/.test(t)) {
      if (/\bchua\b/.test(t) && !/\b(ra roi|ra rồi)\b/.test(t)) return false;
      return true;
    }
    if (/\bchua\b/.test(t) || /\bchua tra\b/.test(t)) return false;
    return false;
  }

  function parseChangePairs(t) {
    var pairs = [];
    var re = /\b([a-z0-9]{1,6})\s+(?:qua|doi|chuyen|doi\s+xe|do\s+xe)\s+(?:xe\s+)?([a-z0-9]{1,6})\b/gi;
    var m;
    while ((m = re.exec(t)) !== null) {
      pairs.push([normalizeCode(m[1]), normalizeCode(m[2])]);
    }
    return pairs;
  }

  /**
   * @returns {{ action: string, carCodes: string[], paid?: boolean, raw: string } | null}
   */
  function parseVoiceCommand(text) {
    var raw = String(text || '').trim();
    if (!raw) return null;
    var t = applyAliases(normalizeText(raw));

    if (/\b(xoa|delete)\b/.test(t)) {
      var cDel = extractCarCodes(t);
      if (!cDel.length) return null;
      return { action: 'delete', carCodes: cDel.slice(0, 1), raw: raw };
    }

    var pairs = parseChangePairs(t);
    if (pairs.length === 2) {
      var p0 = pairs[0];
      var p1 = pairs[1];
      if (p0[0] === p1[1] && p0[1] === p1[0]) {
        return { action: 'swap_cars', carCodes: [p0[0], p0[1]], raw: raw };
      }
    }
    if (pairs.length >= 1 && (/\b(qua|doi|chuyen|doi xe|do xe)\b/.test(t))) {
      return { action: 'change_car', carCodes: [pairs[0][0], pairs[0][1]], raw: raw };
    }

    if (/\b(thanh toan|da tra|thu tien)\b/.test(t) || /\s+r\b/.test(t)) {
      var cPay = extractCarCodes(t);
      if (!cPay.length) return null;
      return { action: 'pay', carCodes: cPay, raw: raw };
    }

    if (/\b(chua tra)\b/.test(t) || (/\s+c\b/.test(t) && !/\bchua\b/.test(t))) {
      var cUn = extractCarCodes(t);
      if (!cUn.length) return null;
      return { action: 'unpay', carCodes: cUn, raw: raw };
    }

    if (/\b(res|tiep tuc|mo lai)\b/.test(t)) {
      var cRes = extractCarCodes(t);
      if (!cRes.length) return null;
      return { action: 'resume', carCodes: cRes, raw: raw };
    }

    var codes = extractCarCodes(t);
    var isVao = /\bvao\b/.test(t) || /\bcho vao\b/.test(t);
    var isRa =
      /\bra\b/.test(t) ||
      /\b(roi|rồi)\b/.test(t) ||
      (/\bchua\b/.test(t) && codes.length > 0 && !isVao);

    if (isVao && codes.length) {
      return { action: 'check_in', carCodes: codes, raw: raw };
    }

    if (isRa && codes.length) {
      return {
        action: 'add_car',
        carCodes: codes,
        paid: detectPaidFlag(t, 'add_car'),
        raw: raw,
      };
    }

    if (codes.length === 1) {
      if (/\bvao\b/.test(t)) return { action: 'check_in', carCodes: codes, raw: raw };
      if (/\bres\b/.test(t)) return { action: 'resume', carCodes: codes, raw: raw };
    }

    return null;
  }

  function getRemainingMs(timeIn, car) {
    if (car && car.isNullTime) return null;
    if (car && car.done && car.pausedAt !== undefined && car.pausedAt !== null) {
      var v = Number(car.pausedAt);
      if (!Number.isFinite(v) || v <= 0) return 0;
      return v;
    }
    var d = timeIn ? new Date(timeIn) : null;
    if (!d || isNaN(d.getTime())) return null;
    return d.getTime() - Date.now();
  }

  function findPrimaryIndex(carCode, preferDone) {
    var list = window.__carListCache || [];
    var want = normalizeCode(carCode);
    var matches = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && normalizeCode(list[i].carCode) === want) matches.push(i);
    }
    if (!matches.length) return -1;
    if (preferDone === true) {
      for (var j = matches.length - 1; j >= 0; j--) {
        if (list[matches[j]].done) return matches[j];
      }
    }
    if (preferDone === false) {
      for (var k = matches.length - 1; k >= 0; k--) {
        if (!list[matches[k]].done) return matches[k];
      }
    }
    return matches[matches.length - 1];
  }

  function persistList(list) {
    window.__carListCache = list;
    try {
      window.dispatchEvent(new CustomEvent('carListUpdated', { detail: { carList: list } }));
    } catch (_) {}
    if (window.saveCarListToFirebase) window.saveCarListToFirebase(list);
  }

  function toggleDoneAtIndex(index) {
    var current = (window.__carListCache || []).slice();
    if (!current[index]) return { ok: false, message: 'Không tìm thấy dòng xe.' };
    var car0 = current[index];
    if (car0.isNullTime) {
      car0.isNullTime = false;
      car0.done = false;
      car0.nullStartTime = undefined;
    } else if (!car0.done) {
      car0.done = true;
      var rem = getRemainingMs(car0.timeIn, car0);
      car0.pausedAt = rem == null || rem <= 0 ? 0 : rem;
    } else {
      car0.done = false;
      var p = Number(car0.pausedAt);
      if (Number.isFinite(p) && p > 0) {
        var now = new Date();
        car0.timeIn = new Date(now.getTime() + p).toISOString();
      }
      car0.pausedAt = undefined;
    }
    persistList(current);
    return {
      ok: true,
      message: car0.done ? 'Đã Vào xe ' + car0.carCode + '.' : 'Đã Res xe ' + car0.carCode + '.',
    };
  }

  function setPaidAtIndex(index, paid) {
    var current = (window.__carListCache || []).slice();
    if (!current[index]) return { ok: false, message: 'Không tìm thấy dòng xe.' };
    current[index].paid = !!paid;
    persistList(current);
    return {
      ok: true,
      message: paid ? 'Xe ' + current[index].carCode + ' đã thanh toán (R).' : 'Xe ' + current[index].carCode + ' chưa thanh toán (C).',
    };
  }

  function deleteAtIndex(index) {
    var current = (window.__carListCache || []).slice();
    if (!current[index]) return { ok: false, message: 'Không tìm thấy dòng xe.' };
    var code = current[index].carCode;
    current.splice(index, 1);
    persistList(current);
    try {
      if (window.multipleCarSelection && typeof window.multipleCarSelection.refreshOutStateIfOpen === 'function') {
        window.multipleCarSelection.refreshOutStateIfOpen();
      }
    } catch (_) {}
    return { ok: true, message: 'Đã xóa xe ' + code + '.' };
  }

  function swapCarCodes(codeA, codeB) {
    var list = (window.__carListCache || []).slice();
    var iA = findPrimaryIndex(codeA, null);
    var iB = findPrimaryIndex(codeB, null);
    if (iA < 0) return { ok: false, message: 'Không thấy xe ' + codeA + ' trên danh sách.' };
    if (iB < 0) return { ok: false, message: 'Không thấy xe ' + codeB + ' trên danh sách.' };
    if (iA === iB) return { ok: false, message: 'Hai mã trùng một dòng.' };
    var tmp = list[iA].carCode;
    list[iA].carCode = list[iB].carCode;
    list[iB].carCode = tmp;
    persistList(list);
    return { ok: true, message: 'Đã đổi chéo ' + codeA + ' ↔ ' + codeB + '.' };
  }

  function executeIntent(intent) {
    if (!intent || !intent.action) return Promise.resolve({ ok: false, message: 'Không hiểu lệnh.' });

    if (intent.action === 'add_car') {
      var codes = intent.carCodes || [];
      if (!codes.length) return Promise.resolve({ ok: false, message: 'Không có mã xe.' });
      var addFn = window.addCarsBatch || window.addCar;
      if (!addFn) return Promise.resolve({ ok: false, message: 'Chưa sẵn sàng Firebase.' });
      var addPromise =
        codes.length > 1 && window.addCarsBatch
          ? window.addCarsBatch(codes)
          : window.addCar(codes[0]);
      return Promise.resolve(addPromise).then(
        function () {
          if (intent.paid) {
            codes.forEach(function (c) {
              var ix = findPrimaryIndex(c, null);
              if (ix >= 0) setPaidAtIndex(ix, true);
            });
          }
          var paidNote = intent.paid ? ' (đã trả R)' : ' (chưa C)';
          return {
            ok: true,
            message: 'Đã cho ' + codes.join(', ') + ' ra' + paidNote + '.',
          };
        },
        function () {
          return { ok: false, message: 'Không thêm được xe.' };
        }
      );
    }

    if (intent.action === 'swap_cars') {
      return Promise.resolve(swapCarCodes(intent.carCodes[0], intent.carCodes[1]));
    }

    if (intent.action === 'change_car') {
      var from = intent.carCodes[0];
      var to = intent.carCodes[1];
      var idx = findPrimaryIndex(from, null);
      if (idx < 0) return Promise.resolve({ ok: false, message: 'Không thấy xe ' + from + '.' });
      if (window.setChangeCarStateRowIndex) window.setChangeCarStateRowIndex(idx);
      if (window.applyChangeCarCode) {
        window.applyChangeCarCode(to);
        return Promise.resolve({ ok: true, message: 'Đã đổi ' + from + ' thành ' + to + '.' });
      }
      return Promise.resolve({ ok: false, message: 'Chức năng đổi xe chưa sẵn sàng.' });
    }

    if (intent.action === 'check_in') {
      var msgsIn = [];
      var okIn = true;
      (intent.carCodes || []).forEach(function (code) {
        var i1 = findPrimaryIndex(code, false);
        if (i1 < 0) {
          okIn = false;
          msgsIn.push(code + ': không thấy');
          return;
        }
        var list = window.__carListCache || [];
        if (list[i1] && list[i1].done) {
          okIn = false;
          msgsIn.push(code + ': đã Vào');
          return;
        }
        var r = toggleDoneAtIndex(i1);
        msgsIn.push(r.message);
      });
      return Promise.resolve({ ok: okIn, message: msgsIn.join(' ') });
    }

    if (intent.action === 'resume') {
      var i2 = findPrimaryIndex(intent.carCodes[0], true);
      if (i2 < 0) return Promise.resolve({ ok: false, message: 'Không thấy xe ' + intent.carCodes[0] + ' đang Vào.' });
      var list2 = window.__carListCache || [];
      if (list2[i2] && !list2[i2].done) {
        return Promise.resolve({ ok: false, message: 'Xe ' + intent.carCodes[0] + ' chưa Vào.' });
      }
      return Promise.resolve(toggleDoneAtIndex(i2));
    }

    if (intent.action === 'pay' || intent.action === 'unpay') {
      var paid = intent.action === 'pay';
      var last = { ok: false, message: 'Không thấy xe.' };
      intent.carCodes.forEach(function (c) {
        var ix = findPrimaryIndex(c, null);
        if (ix >= 0) last = setPaidAtIndex(ix, paid);
      });
      return Promise.resolve(last);
    }

    if (intent.action === 'delete') {
      var i3 = findPrimaryIndex(intent.carCodes[0], null);
      if (i3 < 0) return Promise.resolve({ ok: false, message: 'Không thấy xe ' + intent.carCodes[0] + '.' });
      if (!window.confirm('Xóa xe ' + intent.carCodes[0] + ' khỏi danh sách?')) {
        return Promise.resolve({ ok: false, message: 'Đã hủy xóa.' });
      }
      return Promise.resolve(deleteAtIndex(i3));
    }

    return Promise.resolve({ ok: false, message: 'Lệnh chưa hỗ trợ.' });
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'vi-VN';
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  /**
   * STT: 'webspeech' (mặc định) hoặc 'whisper' (cần proxy Groq — nghe tốt hơn nhiều).
   * Đặt trước khi load file: window.VOICE_STT_CONFIG = { mode:'whisper', whisperProxyUrl:'https://...' }
   */
  var STT_CONFIG = window.VOICE_STT_CONFIG || {
    mode: 'webspeech',
    whisperProxyUrl: '',
  };

  function useWhisper() {
    return STT_CONFIG.mode === 'whisper' && String(STT_CONFIG.whisperProxyUrl || '').trim();
  }

  function formatIntentPreview(intent) {
    if (!intent) return 'Chưa hiểu lệnh — sửa câu hoặc xem Voice_check.md';
    var p = intent.paid ? ' · đã trả R' : intent.paid === false ? ' · chưa C' : '';
    return intent.action + p + ' → ' + (intent.carCodes || []).join(', ');
  }

  function createUi() {
    var btn = document.getElementById('voiceMicBtn');
    var panel = document.getElementById('voiceStatusPanel');
    var line1 = document.getElementById('voiceLine1');
    var line2 = document.getElementById('voiceLine2');
    var confirmBlock = document.getElementById('voiceConfirmBlock');
    var input = document.getElementById('voiceTranscriptInput');
    var preview = document.getElementById('voicePreview');
    var hint = document.getElementById('voiceHint');
    var retryBtn = document.getElementById('voiceRetryBtn');
    var cancelBtn = document.getElementById('voiceCancelBtn');
    var runBtn = document.getElementById('voiceRunBtn');
    if (!btn || !panel || !input) return null;

    function updatePreview() {
      var intent = parseVoiceCommand(input.value);
      preview.textContent = formatIntentPreview(intent);
      preview.classList.toggle('is-error', !intent);
      runBtn.disabled = !intent;
    }

    return {
      btn: btn,
      panel: panel,
      line1: line1,
      input: input,
      confirmBlock: confirmBlock,
      hint: hint,
      updatePreview: updatePreview,
      setListening: function (on, sub) {
        btn.classList.toggle('is-listening', on);
        btn.classList.toggle('is-busy', false);
        panel.classList.toggle('is-visible', on);
        panel.classList.toggle('is-interactive', false);
        confirmBlock.hidden = true;
        line1.textContent = on ? 'Đang nghe… (thả tay để dừng)' : '';
        line2.textContent = on ? sub || 'Nói rõ, gần mic' : '';
        hint.hidden = on;
      },
      showConfirm: function (text) {
        btn.classList.remove('is-listening', 'is-busy');
        panel.classList.add('is-visible', 'is-interactive');
        confirmBlock.hidden = false;
        line1.textContent = 'Nghe được (có thể sai — hãy sửa):';
        line2.textContent = useWhisper() ? 'STT: Whisper' : 'STT: trình duyệt (kém hơn)';
        input.value = text;
        updatePreview();
        hint.hidden = false;
        hint.textContent = 'Sửa chữ nếu sai · bấm Chạy';
        window.setTimeout(function () {
          input.focus();
          input.select();
        }, 80);
      },
      setResult: function (ok, message, meta) {
        panel.classList.add('is-visible');
        panel.classList.toggle('is-interactive', false);
        confirmBlock.hidden = true;
        line1.textContent = message;
        line2.textContent = meta || '';
        hint.hidden = true;
        btn.classList.remove('is-listening', 'is-busy');
      },
      hide: function () {
        panel.classList.remove('is-visible', 'is-interactive');
        confirmBlock.hidden = true;
        line1.textContent = '';
        line2.textContent = '';
        hint.hidden = false;
        btn.classList.remove('is-listening', 'is-busy');
      },
      retryBtn: retryBtn,
      cancelBtn: cancelBtn,
      runBtn: runBtn,
    };
  }

  function init() {
    var ui = createUi();
    if (!ui) return;

    var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    var canWebSpeech = !!SpeechRec;
    var canWhisper = !!useWhisper();

    if (!canWebSpeech && !canWhisper) {
      ui.setResult(false, 'Chưa cấu hình STT.', 'Đặt VOICE_STT_CONFIG.whisperProxyUrl hoặc dùng Chrome.');
      ui.btn.disabled = true;
      return;
    }

    if (canWhisper) {
      ui.hint.textContent = 'Giữ mic · Whisper (nghe tốt hơn)';
    } else {
      ui.hint.textContent = 'Giữ mic · Sửa chữ trước khi Chạy · Cấu Whisper để nghe tốt hơn';
    }

    var listening = false;
    var lastFinal = '';
    var recognition = null;
    var mediaRecorder = null;
    var mediaChunks = [];
    var micStream = null;

    if (canWebSpeech) {
      recognition = new SpeechRec();
      recognition.lang = 'vi-VN';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 5;
    }

    function bestTranscript(ev) {
      var fin = '';
      var interim = '';
      for (var i = 0; i < ev.results.length; i++) {
        var alt = ev.results[i][0] && ev.results[i][0].transcript;
        if (!alt) continue;
        if (ev.results[i].isFinal) fin += alt;
        else interim += alt;
      }
      return (fin || interim).trim();
    }

    function stopMicStream() {
      if (micStream) {
        micStream.getTracks().forEach(function (t) {
          t.stop();
        });
        micStream = null;
      }
    }

    function transcribeWhisper(blob) {
      var url = String(STT_CONFIG.whisperProxyUrl).trim().replace(/\/$/, '');
      var fd = new FormData();
      fd.append('file', blob, 'voice.webm');
      return fetch(url, { method: 'POST', body: fd })
        .then(function (r) {
          return r.json().then(function (j) {
            if (!r.ok) throw new Error((j && j.error) || r.statusText);
            return j;
          });
        })
        .then(function (j) {
          return String((j && j.text) || '').trim();
        });
    }

    function startWhisperCapture() {
      return navigator.mediaDevices
        .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
        .then(function (stream) {
          micStream = stream;
          mediaChunks = [];
          var mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';
          mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
          mediaRecorder.ondataavailable = function (e) {
            if (e.data && e.data.size) mediaChunks.push(e.data);
          };
          mediaRecorder.start(200);
        });
    }

    function stopWhisperCapture() {
      return new Promise(function (resolve, reject) {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
          stopMicStream();
          resolve('');
          return;
        }
        mediaRecorder.onstop = function () {
          var blob = new Blob(mediaChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
          stopMicStream();
          mediaRecorder = null;
          if (!blob.size) {
            resolve('');
            return;
          }
          ui.btn.classList.add('is-busy');
          ui.setListening(false, 'Đang nhận dạng Whisper…');
          transcribeWhisper(blob)
            .then(resolve)
            .catch(reject);
        };
        try {
          mediaRecorder.stop();
        } catch (e) {
          reject(e);
        }
      });
    }

    function onTranscriptReady(text) {
      listening = false;
      ui.btn.classList.remove('is-busy');
      if (!text) {
        ui.setResult(false, 'Không nghe thấy.', 'Giữ mic lâu hơn, nói gần & rõ.');
        window.setTimeout(function () {
          ui.hide();
        }, 3000);
        return;
      }
      ui.showConfirm(text);
    }

    function startListening() {
      if (listening) return;
      listening = true;
      lastFinal = '';

      if (canWhisper) {
        ui.setListening(true, 'Whisper · nói xong thả tay');
        startWhisperCapture().catch(function (e) {
          listening = false;
          ui.setResult(false, 'Không mở được mic.', String(e.message || e));
        });
        return;
      }

      if (!recognition) return;
      ui.setListening(true, 'VD: A1 ra · Xuồng vàng ra rồi');
      recognition.onresult = function (ev) {
        var t = bestTranscript(ev);
        if (t) lastFinal = t;
        ui.setListening(true, lastFinal || '…');
      };
      recognition.onerror = function (ev) {
        if (ev.error === 'no-speech' && lastFinal) return;
        listening = false;
        var msg = ev.error === 'not-allowed' ? 'Cần quyền micro.' : 'Lỗi: ' + (ev.error || '');
        ui.setResult(false, msg, '');
      };
      recognition.onend = function () {
        if (!listening) return;
        listening = false;
        onTranscriptReady((lastFinal || '').trim());
      };
      try {
        recognition.start();
      } catch (e) {
        listening = false;
        ui.setResult(false, 'Không bật mic.', String(e.message || e));
      }
    }

    function stopListening() {
      if (!listening) return;

      if (canWhisper && mediaRecorder) {
        listening = false;
        stopWhisperCapture()
          .then(onTranscriptReady)
          .catch(function (e) {
            ui.setResult(false, 'Whisper lỗi.', String(e.message || e));
          });
        return;
      }

      if (recognition) {
        listening = false;
        try {
          recognition.stop();
        } catch (_) {
          onTranscriptReady((lastFinal || '').trim());
        }
      }
    }

    function runFromInput() {
      var text = (ui.input.value || '').trim();
      if (!text) return;
      var intent = parseVoiceCommand(text);
      if (!intent) {
        ui.updatePreview();
        speak('Không hiểu lệnh');
        return;
      }
      var meta = formatIntentPreview(intent);
      ui.panel.classList.remove('is-interactive');
      ui.confirmBlock.hidden = true;
      ui.btn.classList.add('is-busy');
      ui.line1.textContent = 'Đang chạy…';
      executeIntent(intent).then(function (res) {
        res = res || { ok: false, message: 'Lỗi.' };
        ui.setResult(res.ok, res.message, meta);
        speak(res.message);
        window.setTimeout(function () {
          ui.hide();
        }, 4500);
      });
    }

    ui.input.addEventListener('input', ui.updatePreview);

    ui.runBtn.addEventListener('click', runFromInput);
    ui.cancelBtn.addEventListener('click', function () {
      ui.hide();
    });
    ui.retryBtn.addEventListener('click', function () {
      ui.hide();
      startListening();
    });

    ui.btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try {
        ui.btn.setPointerCapture(e.pointerId);
      } catch (_) {}
      startListening();
    });

    ui.btn.addEventListener('pointerup', function (e) {
      e.preventDefault();
      stopListening();
    });

    ui.btn.addEventListener('pointercancel', function () {
      stopListening();
    });

    window.VoiceAssistant = {
      VOICE_VOCAB: VOICE_VOCAB,
      STT_CONFIG: STT_CONFIG,
      parseVoiceCommand: parseVoiceCommand,
      executeIntent: executeIntent,
      applyAliases: applyAliases,
      extractCarCodes: extractCarCodes,
      speak: speak,
      startListening: startListening,
      stopListening: stopListening,
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
