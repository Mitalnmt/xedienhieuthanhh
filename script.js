let carList = [];
let carIdCounter = 1;
let changeCarIndex = null; // null: chọn xe mới, số: đổi mã xe
let defaultTimeMinutes = 15; // Thời gian mặc định (phút)
let defaultTimeSeconds = 30; // Thời gian mặc định (giây)
let xStepMinutes = 15; // Bước tăng/giảm cho nút -1x/+1x (phút)

// Trạng thái chọn nhiều dòng
let selectedIds = new Set();

// Test script loading
console.log('Script.js loaded successfully');
let multiSelectMode = false; // Bật/tắt chọn nhiều bằng click dòng (kích hoạt 1 lần)

// Biến cho chức năng undo
let undoHistory = []; // Lưu lịch sử các thao tác
let maxUndoSteps = 20; // Số bước undo tối đa
let undoInProgress = false; // Cờ để tránh undo liên tiếp

  

// Hàm lưu trạng thái hiện tại vào lịch sử
function saveToHistory() {
  try {
    // Kiểm tra xem có thay đổi thực sự không
    const currentState = JSON.stringify(carList.map(car => ({
      ...car,
      timeOut: car.timeOut.toISOString(),
      timeIn: car.timeIn.toISOString()
    })));
    
    // So sánh với trạng thái cuối cùng trong lịch sử
    if (undoHistory.length > 0) {
      const lastState = undoHistory[undoHistory.length - 1];
      if (lastState === currentState) {
        return; // Không lưu nếu trạng thái giống nhau
      }
    }
    
    undoHistory.push(currentState);
    
    // Giới hạn số bước undo
    if (undoHistory.length > maxUndoSteps) {
      undoHistory.shift();
    }
  } catch (error) {
    console.error('Lỗi khi lưu lịch sử:', error);
  }
}

// Hàm undo - quay lại trạng thái trước đó
function undo() {
  // Kiểm tra xem có đang thực hiện undo không
  if (undoInProgress) {
    return;
  }
  
  if (undoHistory.length === 0) {
    showToast('Không có thao tác nào để quay lại!', 'warning');
    return;
  }
  
  // Đặt cờ để tránh undo liên tiếp
  undoInProgress = true;
  
  try {
    const previousState = undoHistory.pop();
    const previousCarList = JSON.parse(previousState).map(car => ({
      ...car,
      timeOut: new Date(car.timeOut),
      timeIn: new Date(car.timeIn)
    }));
    
    // Cập nhật carList
    carList = previousCarList;
    
    // Gọi saveCarListToStorage với skipHistory=true để không tạo loop
    saveCarListToStorage(true);
    
    // Render lại giao diện ngay lập tức
    renderCarList();
    
    // Hiển thị thông báo
    showToast(`Đã quay lại! (${carList.length} xe)`, 'success');
    
  } catch (error) {
    console.error('Lỗi khi thực hiện undo:', error);
    showToast('Có lỗi xảy ra khi undo!', 'danger');
  } finally {
    // Reset cờ sau 300ms
    setTimeout(() => {
      undoInProgress = false;
    }, 300);
  }
}

// Hàm hiển thị toast thông báo
function showToast(message, type = 'info') {
  // Tạo toast element nếu chưa có
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'position-fixed top-0 start-50 translate-middle-x p-3';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }
  
  const toastId = 'toast-' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;
  
  toastContainer.insertAdjacentHTML('beforeend', toastHtml);
  
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement);
  toast.show();
  
  // Tự động xóa toast sau khi ẩn
  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
}

// Thêm xe vào danh sách hoặc đổi mã xe
function selectCarCode(carCode) {
  const modalEl = document.getElementById('carModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) modal.hide(); // Đóng modal NGAY lập tức

  setTimeout(() => {
    if (changeCarIndex === null) {
      addCar(carCode);
    } else {
      // Lưu tất cả mã xe cũ vào mảng oldCarCodes
      if (!carList[changeCarIndex].oldCarCodes) {
        carList[changeCarIndex].oldCarCodes = [];
      }
      if (carList[changeCarIndex].carCode !== carCode) {
        carList[changeCarIndex].oldCarCodes.push(carList[changeCarIndex].carCode);
      }
      carList[changeCarIndex].carCode = carCode;
      changeCarIndex = null;
      saveCarListToStorage(false);
      // renderCarList(); // BỎ
    }
  }, 100); // Đợi modal đóng xong mới render lại bảng
}

// Khi ấn nút chọn xe
const showModalBtn = document.getElementById('showModalBtn');
if (showModalBtn) {
  showModalBtn.addEventListener('click', function() {
    changeCarIndex = null;
  });
}

// Thêm xe vào danh sách
function addCar(carCode, groupMeta) {
  const now = new Date();
  const timeOut = new Date(now.getTime());  // Thời gian ra là thời gian hiện tại
  const timeIn = new Date(timeOut.getTime());  // Thời gian vào là 15 phút sau thời gian ra
  timeIn.setMinutes(timeOut.getMinutes() + defaultTimeMinutes);
  timeIn.setSeconds(timeOut.getSeconds() + defaultTimeSeconds);  // Thêm thời gian mặc định vào thời gian ra để có thời gian vào

  const car = {
    id: carIdCounter++,
    carCode: carCode,
    timeOut: timeOut,
    timeIn: timeIn,
    paid: false,
    done: false,
    timeChanged: "",  // Lưu giá trị cộng trừ
    // Nhóm đi chung (nếu có)
    groupId: groupMeta && groupMeta.groupId ? groupMeta.groupId : undefined,
    groupColor: groupMeta && groupMeta.groupColor ? groupMeta.groupColor : undefined,
  };

  carList.push(car);
  saveCarListToStorage(false);
  // renderCarList(); // BỎ

  // Đóng modal sau khi chọn xe
  const modalEl = document.getElementById('carModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) modal.hide();
}

// Render danh sách xe
function renderCarList() {
  const tbody = document.getElementById('car-list').getElementsByTagName('tbody')[0];
  tbody.innerHTML = '';  // Xóa các dòng cũ

  // Đếm số lượng xe theo mã xe (chỉ đếm xe chưa được ấn vào)
  const countByCode = {};
  carList.forEach(car => {
    if (!car.done) { // Chỉ đếm xe chưa được ấn vào (chưa có done = true)
      countByCode[car.carCode] = (countByCode[car.carCode] || 0) + 1;
    }
  });

  carList.forEach((car, index) => {
    // Dòng chính
    const row = tbody.insertRow();

    // Toggle chọn dòng khi click nền dòng (bỏ qua click vào các nút bên trong)
    row.addEventListener('click', function(e) {
      if (!multiSelectMode) return;
      const target = e.target;
      if (target.closest('button') || target.closest('input') || target.closest('a') || target.closest('.btn')) {
        return;
      }
      handleRowClick(car.id, row);
    });

    // Nếu đang được chọn
    if (selectedIds.has(car.id)) {
      row.classList.add('row-selected');
    }

    // Số thứ tự
    const cell1 = row.insertCell(0);
    cell1.textContent = index + 1;

    // Trạng thái
    const cell2 = row.insertCell(1);
    // Nút trạng thái: 'C' (vàng) hoặc 'R' (xanh)
    const isPaid = car.paid;
    let statusHtml = `<button class="btn btn-status btn-sm ${isPaid ? 'btn-success' : 'btn-warning'}" onclick="togglePaid(${index})">${isPaid ? 'R' : 'C'}</button>`;
    if (car.note) {
      statusHtml += ` <div class='car-note'>${car.note}</div>`;
    }
    cell2.innerHTML = statusHtml;

    // Mã xe mới + các mã xe cũ (nếu có)
    const cell3 = row.insertCell(2);
    let colorStyle = '';
    if (car.groupColor) {
      colorStyle = `color: ${car.groupColor};`;
    }
    const borderStyle = car.groupColor ? `border-color: ${car.groupColor};` : '';
    const groupedClass = car.groupColor ? 'grouped' : 'no-border';
    let carCodeHtml = `<button class="btn btn-sm car-code-btn ${groupedClass}" style="${colorStyle}${borderStyle}" onclick="changeCarCode(${index})">${car.carCode}</button>`;
    if (car.oldCarCodes && car.oldCarCodes.length > 0) {
      carCodeHtml += ` <div class='old-car-code-italic'>(` + car.oldCarCodes.map(code => `${code}`).join(', ') + `)</div>`;
    }
    cell3.innerHTML = carCodeHtml;

    // Thời gian ra và vào (hiển thị cả hai) - định dạng 12h không có AM/PM
    const cell4 = row.insertCell(3);
    const timeOutFormatted = car.timeOut.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    }).replace(/[AP]M/g, '').trim();
    const timeInFormatted = car.timeIn.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    }).replace(/[AP]M/g, '').trim();
    cell4.innerHTML = `<div><span style='font-size:0.95em;'><b>${timeOutFormatted}</b></span><br><span style='font-size:0.9em;color:#2196f3;'><b>${timeInFormatted}</b></span></div>`;

    // Thời gian còn lại (hiển thị đếm ngược)
    const cell5 = row.insertCell(4);
    const remainingTime = getRemainingTime(car.timeIn, car);
    cell5.innerHTML = `<span class="countdown">${remainingTime}</span>`;

    // Action buttons (các nút)
    const cell6 = row.insertCell(5); // Đây là cột thứ 6 (index 5)
    cell6.innerHTML = `
      <button class="btn btn-success btn-sm" onclick="toggleDone(${index})">${car.done ? 'Res' : 'Vào'}</button>
      <button class='btn btn-secondary btn-sm' onclick='openRowActionModal(${index})'>...</button>
    `;

    // Không render dòng phụ nữa
  });

  // Áp dụng class trạng thái sau khi tạo xong tất cả các dòng
  carList.forEach((car, index) => {
    const row = tbody.rows[index];
    if (!row) return;
    
    // Kiểm tra trạng thái để set class
    if (car.isNullTime) {
      row.classList.add('null-time-done');
    } else if (car.done) {
      row.classList.add('done');
    } else {
      const isOverdue = getRemainingTimeInMillis(car.timeIn, car) <= 0;
      const isDuplicate = !car.done && countByCode[car.carCode] >= 2;
      
      if (isOverdue && isDuplicate) {
        // Xe vừa bị trùng vừa hết thời gian - nhấp nháy vàng-đỏ
        console.log(`Xe ${car.carCode} vừa trùng vừa hết thời gian - áp dụng duplicate-overdue`);
        row.classList.add('duplicate-overdue');
      } else if (isOverdue) {
        // Chỉ hết thời gian - màu đỏ
        row.classList.add('overdue');
      } else if (isDuplicate) {
        // Chỉ bị trùng - nhấp nháy vàng
        row.classList.add('duplicate-done');
      }
    }
  });

  // Thêm dòng xe ảo để tạo khoảng trống tránh bị bottom bar che
  const spacerRow = tbody.insertRow();
  spacerRow.classList.add('spacer-row');
  spacerRow.style.height = '100px'; // Chiều cao đủ để tạo khoảng trống
  
  // Tạo các ô trống
  for (let i = 0; i < 6; i++) {
    const spacerCell = spacerRow.insertCell(i);
    spacerCell.innerHTML = '&nbsp;'; // Nội dung trống
    spacerCell.style.border = 'none';
    spacerCell.style.background = 'transparent';
  }

  // Cập nhật thanh chọn nhiều
  updateSelectionBar();

  // setTimeout(updateCountdowns, 1000); // BỎ, sẽ gọi ở ngoài
}

// Đếm ngược thời gian
function getRemainingTime(timeIn, car) {
  if (car && car.isNullTime) {
    if (!car.timeOut) return '00:00';
    const now = Date.now();
    const elapsed = Math.floor((now - new Date(car.timeOut).getTime()) / 1000); // Thời gian đã trôi qua từ timeOut
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  if (car && car.done && car.pausedAt !== undefined) {
    if (car.pausedAt <= 0) return '00:00';
    const minutes = Math.floor(car.pausedAt / 60000);
    const seconds = Math.floor((car.pausedAt % 60000) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  const remainingTimeInMillis = getRemainingTimeInMillis(timeIn, car);
  if (remainingTimeInMillis <= 0) return '00:00';
  const minutes = Math.floor(remainingTimeInMillis / 60000);
  const seconds = Math.floor((remainingTimeInMillis % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Tính thời gian còn lại trong mili giây
function getRemainingTimeInMillis(timeIn, car) {
  if (car && car.isNullTime) return 0;
  if (car && car.done && car.pausedAt !== undefined) {
    return car.pausedAt;
  }
  const now = new Date();
  return timeIn - now;
}

// Cập nhật tất cả thời gian còn lại
function updateCountdowns() {
  // Kiểm tra xe hết thời gian để cảnh báo
  let hasOverdue = false;
  let needRerender = false;
  carList.forEach((car, idx) => {
    const wasOverdue = car._wasOverdue || false;
    const isOverdue = !car.done && !car.isNullTime && getRemainingTimeInMillis(car.timeIn, car) <= 0;
    if (isOverdue && !wasOverdue) {
      needRerender = true;
    }
    car._wasOverdue = isOverdue;
    if (isOverdue) {
      if (!overdueNotifiedIds.has(car.id)) {
        notifyOverdue(car);
        overdueNotifiedIds.add(car.id);
      }
      hasOverdue = true;
    } else {
      // Nếu xe không còn overdue, bỏ khỏi set để có thể cảnh báo lại nếu reset
      overdueNotifiedIds.delete(car.id);
    }
  });
  if (needRerender) {
    renderCarList();
  }
  // Cập nhật countdown cho từng dòng (nếu bảng đã render)
  const tbody = document.getElementById('car-list').getElementsByTagName('tbody')[0];
  if (tbody) {
    // Đếm lại số lượng xe theo mã xe (chỉ đếm xe chưa được ấn vào)
    const countByCode = {};
    carList.forEach(car => {
      if (!car.done) { // Chỉ đếm xe chưa được ấn vào (chưa có done = true)
        countByCode[car.carCode] = (countByCode[car.carCode] || 0) + 1;
      }
    });
    
    for (let i = 0; i < carList.length; i++) {
      const row = tbody.rows[i];
      if (row) {
        const countdownCell = row.cells[4];
        if (countdownCell) {
          countdownCell.innerHTML = `<span class="countdown">${getRemainingTime(carList[i].timeIn, carList[i])}</span>`;
        }
        row.classList.remove('done', 'overdue', 'null-time-done', 'duplicate-done', 'duplicate-overdue', 'row-selected');
        const car = carList[i];
        if (car.isNullTime) {
          row.classList.add('null-time-done');
        } else if (car.done) {
          row.classList.add('done');
        } else {
          const isOverdue = getRemainingTimeInMillis(car.timeIn, car) <= 0;
          const isDuplicate = !car.done && countByCode[car.carCode] >= 2;
          
          if (isOverdue && isDuplicate) {
            // Xe vừa bị trùng vừa hết thời gian - nhấp nháy vàng-đỏ
            row.classList.add('duplicate-overdue');
          } else if (isOverdue) {
            // Chỉ hết thời gian - màu đỏ
            row.classList.add('overdue');
          } else if (isDuplicate) {
            // Chỉ bị trùng - nhấp nháy vàng
            row.classList.add('duplicate-done');
          }
        }
        if (selectedIds.has(car.id)) {
          row.classList.add('row-selected');
        }
      }
    }
  }
  setTimeout(updateCountdowns, 1000);
}

// Toggle trạng thái thanh toán
function togglePaid(index) {
  carList[index].paid = !carList[index].paid;
  // Cập nhật lại nút trạng thái, không render lại toàn bộ bảng
  const tbody = document.getElementById('car-list').getElementsByTagName('tbody')[0];
  const row = tbody.rows[index];
  if (row) {
    const btn = row.cells[1].querySelector('button.btn-status');
    if (btn) {
      if (carList[index].paid) {
        btn.classList.remove('btn-warning');
        btn.classList.add('btn-success');
        btn.textContent = 'R';
      } else {
        btn.classList.remove('btn-success');
        btn.classList.add('btn-warning');
        btn.textContent = 'C';
      }
    }
  }
  // Lưu dữ liệu sau khi đã cập nhật UI
  saveCarListToStorage(false);
}

// Đổi mã xe
function changeCarCode(index) {
  changeCarIndex = index;
  // Mở modal
  const modalEl = document.getElementById('carModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

// Thay đổi thời gian
function changeTime(index, delta = 1) {
  const car = carList[index];
  
  // Kiểm tra và thay đổi thời gian vào, giữ nguyên thời gian ra
  const newTimeIn = new Date(car.timeIn);
  newTimeIn.setSeconds(newTimeIn.getSeconds() + delta * 60);

  // Kiểm tra nếu thời gian vào không được phép nhỏ hơn thời gian ra
  if (newTimeIn < car.timeOut) {
    alert('Thời gian vào không thể nhỏ hơn thời gian ra!');
    return;
  }

  car.timeIn = newTimeIn;
  saveCarListToStorage(false);
  // Chỉ cập nhật lại countdown và class cho dòng này
  const tbody = document.getElementById('car-list').getElementsByTagName('tbody')[0];
  const row = tbody.rows[index];
  if (row) {
    // Cập nhật countdown
    const countdownCell = row.cells[4];
    if (countdownCell) {
      countdownCell.innerHTML = `<span class="countdown">${getRemainingTime(car.timeIn, car)}</span>`;
    }
    // Cập nhật class
    row.classList.remove('done', 'overdue', 'duplicate-done', 'duplicate-overdue');
    if (car.done) {
      row.classList.add('done');
    } else {
      // Đếm lại số lượng xe theo mã xe để kiểm tra trùng
      const countByCode = {};
      carList.forEach(c => {
        if (!c.done) {
          countByCode[c.carCode] = (countByCode[c.carCode] || 0) + 1;
        }
      });
      
      const isOverdue = getRemainingTimeInMillis(car.timeIn, car) <= 0;
      const isDuplicate = !car.done && countByCode[car.carCode] >= 2;
      
      if (isOverdue && isDuplicate) {
        // Xe vừa bị trùng vừa hết thời gian - nhấp nháy vàng-đỏ
        row.classList.add('duplicate-overdue');
      } else if (isOverdue) {
        // Chỉ hết thời gian - màu đỏ
        row.classList.add('overdue');
      } else if (isDuplicate) {
        // Chỉ bị trùng - nhấp nháy vàng
        row.classList.add('duplicate-done');
      }
    }
  }
}

// Đánh dấu xe đã vào hoặc resume
function toggleDone(index) {
  const car = carList[index];
  if (car.isNullTime) {
    car.isNullTime = false;
    car.done = false;
    car.nullStartTime = undefined;
    saveCarListToStorage(false); // Cập nhật lên database khi thoát chế độ null
  } else if (!car.done) {
    car.done = true;
    car.pausedAt = getRemainingTimeInMillis(car.timeIn, car);
  } else {
    car.done = false;
    if (car.pausedAt > 0) {
      const now = new Date();
      car.timeIn = new Date(now.getTime() + car.pausedAt);
    }
    car.pausedAt = undefined; // Đảm bảo xóa pausedAt khi resume
  }
  // Cập nhật UI cục bộ cho dòng này
  const tbody = document.getElementById('car-list').getElementsByTagName('tbody')[0];
  const row = tbody.rows[index];
  if (row) {
    // Cập nhật nút Resume/Done
    const btn = row.cells[5].querySelector('button.btn.btn-success');
    if (btn) {
      btn.textContent = car.done ? 'Res' : 'Vào';
    }
    // Cập nhật class dòng
    row.classList.remove('done', 'overdue', 'null-time-done', 'duplicate-done', 'duplicate-overdue');
    if (car.isNullTime) {
      row.classList.add('null-time-done');
    } else if (car.done) {
      row.classList.add('done');
    } else {
      // Đếm lại số lượng xe theo mã xe để kiểm tra trùng
      const countByCode = {};
      carList.forEach(c => {
        if (!c.done) {
          countByCode[c.carCode] = (countByCode[c.carCode] || 0) + 1;
        }
      });
      
      const isOverdue = getRemainingTimeInMillis(car.timeIn, car) <= 0;
      const isDuplicate = !car.done && countByCode[car.carCode] >= 2;
      
      if (isOverdue && isDuplicate) {
        // Xe vừa bị trùng vừa hết thời gian - nhấp nháy vàng-đỏ
        row.classList.add('duplicate-overdue');
      } else if (isOverdue) {
        // Chỉ hết thời gian - màu đỏ
        row.classList.add('overdue');
      } else if (isDuplicate) {
        // Chỉ bị trùng - nhấp nháy vàng
        row.classList.add('duplicate-done');
      }
    }
  }
  saveCarListToStorage(false);
}

// Xóa xe khỏi danh sách
function deleteCar(index) {
  if (!confirm('Bạn có chắc chắn muốn xóa dòng này?')) return;
  
  carList.splice(index, 1);
  saveCarListToStorage(false);
  // renderCarList(); // BỎ
}

// Chọn/bỏ chọn dòng theo click
function handleRowClick(carId, rowEl) {
  if (!multiSelectMode) return;
  if (selectedIds.has(carId)) {
    selectedIds.delete(carId);
    if (rowEl) rowEl.classList.remove('row-selected');
  } else {
    selectedIds.add(carId);
    if (rowEl) rowEl.classList.add('row-selected');
  }
  updateSelectionBar();
}

// Chọn tất cả dòng hiện có
function selectAllRows() {
  carList.forEach(c => selectedIds.add(c.id));
  renderCarList();
  updateSelectionBar();
}

// Bỏ chọn tất cả
function clearSelection() {
  selectedIds.clear();
  renderCarList();
  // Tắt luôn chế độ chọn dòng khi bấm Bỏ chọn
  multiSelectMode = false;
  const table = document.getElementById('car-list');
  if (table) table.classList.remove('select-mode');
  updateSelectionBar();
}

// Xóa các dòng đã chọn
function deleteSelectedRows() {
  if (selectedIds.size === 0) return;
  if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} dòng đã chọn?`)) return;
  carList = carList.filter(c => !selectedIds.has(c.id));
  selectedIds.clear();
  saveCarListToStorage(false);
  renderCarList();
  updateSelectionBar();
  showToast('Đã xóa các dòng đã chọn!', 'success');
  // Tự tắt chế độ chọn nhiều sau khi xóa
  multiSelectMode = false;
  const table = document.getElementById('car-list');
  if (table) table.classList.remove('select-mode');
  updateSelectionBar();
}

// Thoát chế độ chọn nhiều
function exitMultiSelectMode() {
  multiSelectMode = false;
  selectedIds.clear();
  updateSelectionBar();
  renderCarList();
  showToast('Đã thoát chế độ chọn nhiều dòng!', 'info');
}

// Cập nhật thanh tác vụ chọn nhiều
function updateSelectionBar() {
  const bar = document.getElementById('selectionBar');
  const countEl = document.getElementById('selectionCount');
  const deleteBtn = document.getElementById('selectionDeleteBtn');
  const deleteBtnDesktop = document.getElementById('selectionDeleteBtnDesktop');
  const timeBtn = document.getElementById('selectionTimeBtn');
  const timeBtnDesktop = document.getElementById('selectionTimeBtnDesktop');
  const noteBtn = document.getElementById('selectionNoteBtn');
  const noteBtnDesktop = document.getElementById('selectionNoteBtnDesktop');
  const groupBtn = document.getElementById('selectionGroupBtn');
  const groupBtnDesktop = document.getElementById('selectionGroupBtnDesktop');
  const ungroupBtn = document.getElementById('selectionUngroupBtn');
  const ungroupBtnDesktop = document.getElementById('selectionUngroupBtnDesktop');
  const selectBtn = document.getElementById('activateMultiSelectBtn');
  
  if (!bar || !countEl) return;
  
  if (!multiSelectMode) {
    bar.style.display = 'none';
    // Disable tất cả buttons
    [deleteBtn, deleteBtnDesktop, timeBtn, timeBtnDesktop, noteBtn, noteBtnDesktop, groupBtn, groupBtnDesktop, ungroupBtn, ungroupBtnDesktop].forEach(btn => {
      if (btn) btn.disabled = true;
    });
    const table = document.getElementById('car-list');
    if (table) table.classList.remove('select-mode');
    // Remove active class from Select button
    if (selectBtn) selectBtn.classList.remove('active');
    return;
  }
  
  // Luôn hiển thị thanh khi ở chế độ chọn nhiều
  bar.style.display = 'flex';
  
  // Add active class to Select button
  if (selectBtn) selectBtn.classList.add('active');
  
  const count = selectedIds.size;
  countEl.textContent = count;
  
  // Enable/disable các nút dựa trên số lượng xe đã chọn
  const deleteButtons = [deleteBtn, deleteBtnDesktop].filter(btn => btn);
  const timeButtons = [timeBtn, timeBtnDesktop].filter(btn => btn);
  const noteButtons = [noteBtn, noteBtnDesktop].filter(btn => btn);
  const groupButtons = [groupBtn, groupBtnDesktop].filter(btn => btn);
  const ungroupButtons = [ungroupBtn, ungroupBtnDesktop].filter(btn => btn);
  
  deleteButtons.forEach(btn => btn.disabled = count === 0);
  timeButtons.forEach(btn => btn.disabled = count === 0);
  noteButtons.forEach(btn => btn.disabled = count === 0);
  
  // Logic cho nút gộp/tách xe
  groupButtons.forEach(btn => btn.disabled = count < 2); // Cần ít nhất 2 xe để gộp
  
  if (ungroupButtons.length > 0) {
    // Kiểm tra xem có xe nào có nhóm không
    const selectedCars = carList.filter(car => selectedIds.has(car.id));
    const hasGroupedCars = selectedCars.some(car => car.groupId);
    ungroupButtons.forEach(btn => btn.disabled = !hasGroupedCars);
  }
}

// --- Chức năng chỉnh thời gian nhiều xe ---
function editTimeForSelectedCars() {
  if (selectedIds.size === 0) return;
  
  const multiTimeModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('multiTimeModal'));
  const countEl = document.getElementById('multiTimeCount');
  if (countEl) countEl.textContent = selectedIds.size;
  
  multiTimeModal.show();
}

function changeMultiTime(deltaMinutes) {
  if (selectedIds.size === 0) return;
  
  let changedCount = 0;
  selectedIds.forEach(id => {
    const index = carList.findIndex(car => car.id === id);
    if (index !== -1) {
      const car = carList[index];
      if (car.isNullTime) car.isNullTime = false; // Bỏ null khi chỉnh lại
      
      const newTimeIn = new Date(car.timeIn);
      newTimeIn.setMinutes(newTimeIn.getMinutes() + deltaMinutes);
      
      // Kiểm tra nếu thời gian vào không được phép nhỏ hơn thời gian ra
      if (newTimeIn >= car.timeOut) {
        car.timeIn = newTimeIn;
        changedCount++;
      }
    }
  });
  
  if (changedCount > 0) {
    saveCarListToStorage(false);
    renderCarList();
    showToast(`Đã chỉnh thời gian cho ${changedCount} xe!`, 'success');
  } else {
    showToast('Không thể chỉnh thời gian vì thời gian vào sẽ nhỏ hơn thời gian ra!', 'warning');
  }
}

function setMultiTimeNull() {
  if (selectedIds.size === 0) return;
  
  selectedIds.forEach(id => {
    const index = carList.findIndex(car => car.id === id);
    if (index !== -1) {
      carList[index].isNullTime = true;
    }
  });
  
  saveCarListToStorage(false);
  renderCarList();
  showToast(`Đã đặt Null cho ${selectedIds.size} xe!`, 'success');
}

// --- Chức năng ghi chú nhiều xe ---
function editNoteForSelectedCars() {
  if (selectedIds.size === 0) return;
  
  const multiNoteModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('multiNoteModal'));
  const countEl = document.getElementById('multiNoteCount');
  const noteInput = document.getElementById('multiNoteInput');
  
  if (countEl) countEl.textContent = selectedIds.size;
  if (noteInput) noteInput.value = '';
  
  multiNoteModal.show();
}

function applyMultiNote() {
  if (selectedIds.size === 0) return;
  
  const noteInput = document.getElementById('multiNoteInput');
  if (!noteInput) return;
  
  const note = noteInput.value.trim();
  let changedCount = 0;
  
  selectedIds.forEach(id => {
    const index = carList.findIndex(car => car.id === id);
    if (index !== -1) {
      carList[index].note = note;
      changedCount++;
    }
  });
  
  saveCarListToStorage(false);
  renderCarList();
  showToast(`Đã cập nhật ghi chú cho ${changedCount} xe!`, 'success');
  
  // Đóng modal
  const multiNoteModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('multiNoteModal'));
  multiNoteModal.hide();
}

// --- Lưu trữ Firebase Realtime Database ---
function saveCarListToStorage(skipHistory = false) {
  // Lưu trạng thái vào lịch sử trước khi thay đổi (nếu không skip)
  if (!skipHistory) {
    saveToHistory();
  }
  
  // Chuyển Date thành string ISO để lưu, pausedAt và nullStartTime giữ nguyên kiểu số hoặc undefined
  const data = carList.map(car => {
    const obj = {
      ...car,
      timeOut: car.timeOut.toISOString(),
      timeIn: car.timeIn.toISOString(),
    };
    // Đảm bảo lưu groupId/groupColor nếu có
    if (typeof car.groupId === 'undefined') {
      delete obj.groupId;
    }
    if (typeof car.groupColor === 'undefined') {
      delete obj.groupColor;
    }
    // pausedAt chỉ lưu nếu là số, nếu undefined thì bỏ
    if (typeof car.pausedAt === 'number') {
      obj.pausedAt = car.pausedAt;
    } else {
      delete obj.pausedAt;
    }
    // nullStartTime chỉ lưu nếu là số, nếu undefined thì bỏ
    if (typeof car.nullStartTime === 'number') {
      obj.nullStartTime = car.nullStartTime;
    } else {
      delete obj.nullStartTime;
    }
    return obj;
  });
  window.db.ref('carList').set(data);
  localStorage.setItem('carIdCounter', carIdCounter); // vẫn lưu idCounter local
}

function loadCarListFromStorage() {
  window.db.ref('carList').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      carList = data.map(car => {
        const obj = {
          ...car,
          timeOut: new Date(car.timeOut),
          timeIn: new Date(car.timeIn),
        };
        // Chuẩn hóa groupId/groupColor
        if (car.groupId === null || car.groupId === '') {
          delete obj.groupId;
        }
        if (car.groupColor === null || car.groupColor === '') {
          delete obj.groupColor;
        }
        // pausedAt phải là số hoặc undefined
        if (typeof car.pausedAt === 'number') {
          obj.pausedAt = car.pausedAt;
        } else if (typeof car.pausedAt === 'string' && car.pausedAt !== '') {
          obj.pausedAt = Number(car.pausedAt);
        } else {
          obj.pausedAt = undefined;
        }
        // nullStartTime phải là số hoặc undefined
        if (typeof car.nullStartTime === 'number') {
          obj.nullStartTime = car.nullStartTime;
        } else if (typeof car.nullStartTime === 'string' && car.nullStartTime !== '') {
          obj.nullStartTime = Number(car.nullStartTime);
        } else {
          obj.nullStartTime = undefined;
        }
        return obj;
      });
    } else {
      carList = [];
    }
    renderCarList();
    
    // Lưu trạng thái sau khi load dữ liệu từ Firebase (chỉ khi khởi tạo)
    if (!window.initialLoadComplete) {
      window.initialLoadComplete = true;
      setTimeout(() => {
        // Lưu trạng thái ban đầu mà không kiểm tra trùng lặp
        const currentState = JSON.stringify(carList.map(car => ({
          ...car,
          timeOut: car.timeOut.toISOString(),
          timeIn: car.timeIn.toISOString()
        })));
        undoHistory.push(currentState);
      }, 100);
    }
  });
  const idCounter = localStorage.getItem('carIdCounter');
  if (idCounter) carIdCounter = Number(idCounter);
}

// Gọi khi trang load
loadCarListFromStorage();
loadSettings();
renderCarList();
updateCountdowns();



// Xóa dữ liệu xe tạm thời cũ nếu có
localStorage.removeItem('tempCars');

// --- Helper: Lấy danh sách mã xe đang ra (chưa done) ---
function getActiveOutCarCodes() {
  try {
    const set = new Set();
    carList.forEach(car => {
      if (!car.done) {
        set.add(car.carCode);
      }
    });
    return set;
  } catch (_) {
    return new Set();
  }
}
window.getActiveOutCarCodes = getActiveOutCarCodes;

// --- Xóa tất cả ---
let confirmDeleteAllCount = 0;
const deleteAllBtn = document.getElementById('deleteAllBtn');
const confirmDeleteAllBtn = document.getElementById('confirmDeleteAllBtn');
const confirmDeleteAllModalEl = document.getElementById('confirmDeleteAllModal');
const confirmDeleteAllCountSpan = document.getElementById('confirmDeleteAllCount');
let confirmDeleteAllModal;
if (confirmDeleteAllModalEl) {
  confirmDeleteAllModal = bootstrap.Modal.getOrCreateInstance(confirmDeleteAllModalEl);
}
if (deleteAllBtn) {
  deleteAllBtn.addEventListener('click', function() {
    confirmDeleteAllCount = 0;
    if (confirmDeleteAllCountSpan) confirmDeleteAllCountSpan.textContent = '0';
    if (confirmDeleteAllModal) confirmDeleteAllModal.show();
    if (settingsModal) settingsModal.hide(); // Đóng modal cài đặt
  });
}
if (confirmDeleteAllBtn) {
  confirmDeleteAllBtn.addEventListener('click', function() {
    confirmDeleteAllCount++;
    if (confirmDeleteAllCountSpan) confirmDeleteAllCountSpan.textContent = confirmDeleteAllCount;
    if (confirmDeleteAllCount >= 5) {
      carList = [];
      saveCarListToStorage(false);
      // renderCarList(); // BỎ
      if (confirmDeleteAllModal) confirmDeleteAllModal.hide();
    }
  });
}

// --- Modal chọn thời gian ---
let currentTimeIndex = null;
const timeModalEl = document.getElementById('timeModal');
const timeModal = timeModalEl ? bootstrap.Modal.getOrCreateInstance(timeModalEl) : null;
const minus5Btn = document.getElementById('minus5Btn');
const minus1Btn = document.getElementById('minus1Btn');
const plus1Btn = document.getElementById('plus1Btn');
const plus5Btn = document.getElementById('plus5Btn');
const nullTimeBtn = document.getElementById('nullTimeBtn');
const minusXBtn = document.getElementById('minusXBtn');
const plusXBtn = document.getElementById('plusXBtn');

function openTimeModal(index) {
  currentTimeIndex = index;
  if (timeModal) timeModal.show();
}

function changeTimeByDelta(deltaMin) {
  if (currentTimeIndex === null) return;
  
  const car = carList[currentTimeIndex];
  if (car.isNullTime) car.isNullTime = false; // Nếu đang null thì bỏ null khi chỉnh lại
  const newTimeIn = new Date(car.timeIn);
  newTimeIn.setMinutes(newTimeIn.getMinutes() + deltaMin);
  if (newTimeIn < car.timeOut) {
    alert('Thời gian vào không thể nhỏ hơn thời gian ra!');
    return;
  }
  car.timeIn = newTimeIn;
  saveCarListToStorage(false);
  // renderCarList(); // BỎ
}

// Gán event listener một lần duy nhất
if (minus5Btn) {
  minus5Btn.onclick = () => { 
    changeTimeByDelta(-5); 
  };
}
if (minus1Btn) {
  minus1Btn.onclick = () => { 
    changeTimeByDelta(-1); 
  };
}
if (plus1Btn) {
  plus1Btn.onclick = () => { 
    changeTimeByDelta(1); 
  };
}
if (plus5Btn) {
  plus5Btn.onclick = () => { 
    changeTimeByDelta(5); 
  };
}
if (nullTimeBtn) {
  nullTimeBtn.onclick = () => {
    if (currentTimeIndex === null) return;
    
    const car = carList[currentTimeIndex];
    car.isNullTime = true;
    car.done = true;
    car.nullStartTime = Date.now();
    saveCarListToStorage(false);
    // renderCarList(); // BỎ
    if (timeModal) timeModal.hide();
  };
}
if (minusXBtn) {
  minusXBtn.onclick = () => {
    changeTimeByDelta(-xStepMinutes);
  };
}
if (plusXBtn) {
  plusXBtn.onclick = () => {
    changeTimeByDelta(xStepMinutes);
  };
}

// Reset currentTimeIndex khi đóng modal
if (timeModalEl) {
  timeModalEl.addEventListener('hidden.bs.modal', function() {
    currentTimeIndex = null;
  });
}

// --- Modal thao tác dòng ---
let currentRowActionIndex = null;
const rowActionModalEl = document.getElementById('rowActionModal');
const rowActionTimeBtn = document.getElementById('rowActionTimeBtn');
const rowActionDeleteBtn = document.getElementById('rowActionDeleteBtn');
const rowActionNoteBtn = document.getElementById('rowActionNoteBtn');
const rowMoveUpBtn = document.getElementById('rowMoveUpBtn');
const rowMoveDownBtn = document.getElementById('rowMoveDownBtn');
let rowActionModal = null;
if (rowActionModalEl) {
  rowActionModal = bootstrap.Modal.getOrCreateInstance(rowActionModalEl);
}
function openRowActionModal(index) {
  currentRowActionIndex = index;
  // Cập nhật enable/disable cho move up/down
  if (rowMoveUpBtn) rowMoveUpBtn.disabled = (index === 0);
  if (rowMoveDownBtn) rowMoveDownBtn.disabled = (index === carList.length - 1);
  if (rowActionModal) rowActionModal.show();
}
if (rowActionTimeBtn) {
  rowActionTimeBtn.onclick = function() {
    if (currentRowActionIndex !== null) openTimeModal(currentRowActionIndex);
    if (rowActionModal) rowActionModal.hide();
  };
}
if (rowActionDeleteBtn) {
  rowActionDeleteBtn.onclick = function() {
    if (currentRowActionIndex !== null) deleteCar(currentRowActionIndex);
    if (rowActionModal) rowActionModal.hide();
  };
}
if (rowActionNoteBtn) {
  rowActionNoteBtn.onclick = function() {
    if (currentRowActionIndex !== null) {
      const car = carList[currentRowActionIndex];
      const note = prompt('Nhập ghi chú cho xe:', car.note || '');
      if (note !== null) {
        car.note = note.trim();
        saveCarListToStorage(false);
        // renderCarList(); // BỎ
      }
    }
    if (rowActionModal) rowActionModal.hide();
  };
}

// Thêm sự kiện cho nút Move Up/Down
if (rowMoveUpBtn) {
  rowMoveUpBtn.onclick = function() {
    if (currentRowActionIndex !== null && currentRowActionIndex > 0) {
      // Di chuyển xe lên
      const temp = carList[currentRowActionIndex];
      carList[currentRowActionIndex] = carList[currentRowActionIndex - 1];
      carList[currentRowActionIndex - 1] = temp;
      saveCarListToStorage(false);
      renderCarList();
      openRowActionModal(currentRowActionIndex - 1);
    }
  };
}
if (rowMoveDownBtn) {
  rowMoveDownBtn.onclick = function() {
    if (currentRowActionIndex !== null && currentRowActionIndex < carList.length - 1) {
      // Di chuyển xe xuống
      const temp = carList[currentRowActionIndex];
      carList[currentRowActionIndex] = carList[currentRowActionIndex + 1];
      carList[currentRowActionIndex + 1] = temp;
      saveCarListToStorage(false);
      renderCarList();
      openRowActionModal(currentRowActionIndex + 1);
    }
  };
}

// --- Cài đặt ---
const settingsBtn = document.getElementById('settingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const exportCarsBtn = document.getElementById('exportCarsBtn');
const settingsModalEl = document.getElementById('settingsModal');
const defaultMinutesInput = document.getElementById('defaultMinutesInput');
const defaultSecondsInput = document.getElementById('defaultSecondsInput');
const xStepMinutesInput = document.getElementById('xStepMinutesInput');
const activateMultiSelectBtn = document.getElementById('activateMultiSelectBtn');
let settingsModal = null;
if (settingsModalEl) {
  settingsModal = bootstrap.Modal.getOrCreateInstance(settingsModalEl);
}
if (settingsBtn && settingsModal) {
  settingsBtn.addEventListener('click', function() {
    loadSettings();
    settingsModal.show();
  });
}
if (saveSettingsBtn && settingsModal) {
  saveSettingsBtn.addEventListener('click', function() {
    saveSettings();
    settingsModal.hide();
  });
}

// Kích hoạt chế độ chọn dòng một lần
if (activateMultiSelectBtn) {
  activateMultiSelectBtn.addEventListener('click', function() {
    multiSelectMode = true;
    selectedIds.clear();
    updateSelectionBar();
    renderCarList();
    const table = document.getElementById('car-list');
    if (table) table.classList.add('select-mode');
    if (settingsModal) settingsModal.hide();
    // Force show overlay selection bar (mobile safe)
    const selBar = document.getElementById('selectionBar');
    if (selBar) selBar.style.display = 'flex';
    showToast('Đã bật chế độ chọn dòng. Chạm vào dòng để chọn/xóa.', 'info');
  });
}

// Event listeners cho nút gộp/tách xe đã được di chuyển vào selection bar

// Event listener cho nút xuất danh sách xe
if (exportCarsBtn) {
  exportCarsBtn.addEventListener('click', function() {
    exportCarList();
  });
}
if (defaultMinutesInput) {
  defaultMinutesInput.addEventListener('input', updateDefaultTimeDisplay);
}
if (defaultSecondsInput) {
  defaultSecondsInput.addEventListener('input', updateDefaultTimeDisplay);
}
if (xStepMinutesInput) {
  xStepMinutesInput.addEventListener('input', function() {
    const val = Number(xStepMinutesInput.value);
    if (!Number.isNaN(val) && val > 0) {
      xStepMinutes = val;
    }
  });
}

function loadSettings() {
  const savedDefaultTime = localStorage.getItem('defaultTimeMinutes');
  const savedDefaultSeconds = localStorage.getItem('defaultTimeSeconds');
  const savedXStep = localStorage.getItem('xStepMinutes');
  if (savedDefaultTime) {
    defaultTimeMinutes = Number(savedDefaultTime);
  }
  if (savedDefaultSeconds) {
    defaultTimeSeconds = Number(savedDefaultSeconds);
  }
  if (savedXStep) {
    xStepMinutes = Number(savedXStep);
  }
  const defaultMinutesInput = document.getElementById('defaultMinutesInput');
  const defaultSecondsInput = document.getElementById('defaultSecondsInput');
  const defaultTimeDisplay = document.getElementById('defaultTimeDisplay');
  const xStepMinutesInput = document.getElementById('xStepMinutesInput');
  if (defaultMinutesInput) {
    defaultMinutesInput.value = defaultTimeMinutes;
  }
  if (defaultSecondsInput) {
    defaultSecondsInput.value = defaultTimeSeconds;
  }
  if (defaultTimeDisplay) {
    defaultTimeDisplay.textContent = `${String(defaultTimeMinutes).padStart(2, '0')}:${String(defaultTimeSeconds).padStart(2, '0')}`;
  }
  if (xStepMinutesInput) {
    xStepMinutesInput.value = xStepMinutes;
  }
}

function saveSettings() {
  const defaultMinutesInput = document.getElementById('defaultMinutesInput');
  const defaultSecondsInput = document.getElementById('defaultSecondsInput');
  const xStepMinutesInput = document.getElementById('xStepMinutesInput');
  if (defaultMinutesInput) {
    defaultTimeMinutes = Number(defaultMinutesInput.value);
    localStorage.setItem('defaultTimeMinutes', defaultTimeMinutes);
  }
  if (defaultSecondsInput) {
    defaultTimeSeconds = Number(defaultSecondsInput.value);
    localStorage.setItem('defaultTimeSeconds', defaultTimeSeconds);
  }
  if (xStepMinutesInput) {
    xStepMinutes = Math.max(1, Number(xStepMinutesInput.value) || xStepMinutes);
    localStorage.setItem('xStepMinutes', xStepMinutes);
  }
  const defaultTimeDisplay = document.getElementById('defaultTimeDisplay');
  if (defaultTimeDisplay) {
    defaultTimeDisplay.textContent = `${String(defaultTimeMinutes).padStart(2, '0')}:${String(defaultTimeSeconds).padStart(2, '0')}`;
  }
}

function updateDefaultTimeDisplay() {
  const defaultMinutesInput = document.getElementById('defaultMinutesInput');
  const defaultSecondsInput = document.getElementById('defaultSecondsInput');
  const defaultTimeDisplay = document.getElementById('defaultTimeDisplay');
  if (defaultMinutesInput) {
    defaultTimeMinutes = Number(defaultMinutesInput.value);
  }
  if (defaultSecondsInput) {
    defaultTimeSeconds = Number(defaultSecondsInput.value);
  }
  if (defaultTimeDisplay) {
    defaultTimeDisplay.textContent = `${String(defaultTimeMinutes).padStart(2, '0')}:${String(defaultTimeSeconds).padStart(2, '0')}`;
  }
}

// Hàm xuất danh sách xe
function exportCarList() {
  if (carList.length === 0) {
    showToast('Không có xe nào để xuất!', 'warning');
    return;
  }

  // Tạo nội dung để xuất
  let exportContent = '=== DANH SÁCH XE HIỆN TẠI ===\n';
  exportContent += `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n`;
  exportContent += `Tổng số xe: ${carList.length}\n\n`;

  carList.forEach((car, index) => {
    exportContent += `--- Xe ${index + 1} ---\n`;
    exportContent += `ID: ${car.id}\n`;
    exportContent += `Mã xe: ${car.carCode}\n`;
    exportContent += `Thời gian ra: ${car.timeOut.toLocaleString('vi-VN')}\n`;
    exportContent += `Thời gian vào: ${car.timeIn.toLocaleString('vi-VN')}\n`;
    exportContent += `Trạng thái thanh toán: ${car.paid ? 'Đã thanh toán (R)' : 'Chưa thanh toán (C)'}\n`;
    exportContent += `Trạng thái: ${car.done ? 'Đã hoàn thành' : 'Đang chạy'}\n`;
    
    if (car.oldCarCodes && car.oldCarCodes.length > 0) {
      exportContent += `Mã xe cũ: ${car.oldCarCodes.join(', ')}\n`;
    }
    
    if (car.note) {
      exportContent += `Ghi chú: ${car.note}\n`;
    }
    
    if (car.isNullTime) {
      exportContent += `Chế độ: Null time\n`;
    }
    
    exportContent += '\n';
  });

  // Tạo file để download
  const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `danh_sach_xe_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Đã xuất danh sách xe thành công!', 'success');
}

// Khi mở modal chọn xe, cập nhật menu xe từ car menu editor
const carModalEl = document.getElementById('carModal');
if (carModalEl) {
  carModalEl.addEventListener('show.bs.modal', function() {
    // Cập nhật menu xe từ car menu editor
    if (window.carMenuEditor) {
      window.carMenuEditor.updateMainMenu();
    }
  });
}

// --- Cảnh báo xe hết thời gian ---
let overdueNotifiedIds = new Set();
function notifyOverdue(car) {
  // Hiện toast
  const toastBody = document.getElementById('overdueToastBody');
  if (toastBody) {
    toastBody.textContent = `Xe ${car.carCode} đã hết thời gian!`;
  }
  const toastEl = document.getElementById('overdueToast');
  if (toastEl) {
    const toast = bootstrap.Toast.getOrCreateInstance(toastEl);
    toast.show();
  }
  // Phát âm thanh beep
  try {
    const ctx = new (window.AudioContext || window.webkit.AudioContext)();
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
    oscillator.onended = () => ctx.close();
  } catch (e) {}
  // Rung thiết bị nếu hỗ trợ
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
  // Hiện notification nếu đã cấp quyền
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Xe hết thời gian', {
      body: `Xe ${car.carCode} đã hết thời gian!`,
      icon: '', // Có thể thêm icon nếu muốn
    });
  }
}

// --- Notification xin quyền ---
const enableNotifyBtn = document.getElementById('enableNotifyBtn');
if (enableNotifyBtn) {
  enableNotifyBtn.onclick = function() {
    if (!('Notification' in window)) {
      alert('Trình duyệt không hỗ trợ thông báo!');
      return;
    }
    Notification.requestPermission().then(function(permission) {
      if (permission === 'granted') {
        alert('Đã bật thông báo!');
      } else {
        alert('Bạn đã từ chối hoặc chưa cấp quyền thông báo.');
      }
    });
  };
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', function() {
    window.open('https://mitalnmt.github.io/ECarbyMital/', '_self');
  });
}

// --- Event listener cho nút Back và phím tắt Ctrl+Z ---
const backBtn = document.getElementById('backBtn');
if (backBtn) {
  backBtn.addEventListener('click', function(e) {
    e.preventDefault(); // Ngăn chặn sự kiện mặc định
    e.stopPropagation(); // Ngăn chặn event bubbling
    undo();
  });
}

// Phím tắt Ctrl+Z để undo
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault(); // Ngăn chặn hành vi mặc định của trình duyệt
    e.stopPropagation(); // Ngăn chặn event bubbling
    undo();
  }
});

// --- Car Menu Editor Event Listeners ---
document.addEventListener('DOMContentLoaded', function() {
  // Mở car menu editor
  const openCarMenuEditorBtn = document.getElementById('openCarMenuEditorBtn');
  if (openCarMenuEditorBtn) {
    openCarMenuEditorBtn.addEventListener('click', function() {
      if (window.carMenuEditor) {
        window.carMenuEditor.renderEditor();
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('carMenuEditorModal'));
        modal.show();
      }
    });
  }

  // Reset car menu về mặc định
  const resetCarMenuBtn = document.getElementById('resetCarMenuBtn');
  if (resetCarMenuBtn) {
    resetCarMenuBtn.addEventListener('click', function() {
      if (confirm('Bạn có chắc chắn muốn reset menu xe về mặc định? Tất cả thay đổi sẽ bị mất.')) {
        if (window.carMenuEditor) {
          window.carMenuEditor.resetToDefault();
          showToast('Đã reset menu xe về mặc định!', 'success');
        }
      }
    });
  }

  // Áp dụng thay đổi car menu
  const applyCarMenuChangesBtn = document.getElementById('applyCarMenuChangesBtn');
  if (applyCarMenuChangesBtn) {
    applyCarMenuChangesBtn.addEventListener('click', function() {
      if (window.carMenuEditor) {
        window.carMenuEditor.updateMainMenu();
        const modal = bootstrap.Modal.getInstance(document.getElementById('carMenuEditorModal'));
        if (modal) modal.hide();
        showToast('Đã áp dụng thay đổi menu xe!', 'success');
      }
    });
  }

  // Fullscreen functionality
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', function() {
      toggleFullscreen();
    });
  }

  // Show/hide floating bar for multi-select modal
  const selectMultipleModalEl = document.getElementById('selectMultipleModal');
  const multiSelectBottomBar = document.getElementById('multiSelectBottomBar');
  const multiSelectGroupBtn = document.getElementById('multiSelectGroupBtn');
  const multiSelectAddBtn = document.getElementById('multiSelectAddBtn');
  if (selectMultipleModalEl && multiSelectBottomBar) {
    selectMultipleModalEl.addEventListener('show.bs.modal', function() {
      multiSelectBottomBar.style.display = 'block'; // overlay current bottom bar
      const size = (window.multipleCarSelection && window.multipleCarSelection.selectedCars) ? window.multipleCarSelection.selectedCars.size : 0;
      if (multiSelectGroupBtn) multiSelectGroupBtn.disabled = size < 2;
      if (multiSelectAddBtn) multiSelectAddBtn.disabled = size === 0;
    });
    selectMultipleModalEl.addEventListener('hidden.bs.modal', function() {
      multiSelectBottomBar.style.display = 'none';
    });
  }
});

// Hàm chuyển đổi toàn màn hình
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    // Vào chế độ toàn màn hình
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    }
  } else {
    // Thoát chế độ toàn màn hình
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

// Lắng nghe sự kiện thay đổi toàn màn hình để cập nhật icon
document.addEventListener('fullscreenchange', updateFullscreenIcon);
document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
document.addEventListener('msfullscreenchange', updateFullscreenIcon);

// (Đã xóa các nút test blink/css và listener liên quan)

function updateFullscreenIcon() {
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (!fullscreenBtn) return;

  if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
    // Đang ở chế độ toàn màn hình - hiển thị icon thoát
    fullscreenBtn.innerHTML = `
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h3.5a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h3.5a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5zM0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-3.5a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zm10 1a1.5 1.5 0 0 1 1.5-1.5h3.5a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4z"/>
      </svg>
    `;
    fullscreenBtn.title = 'Thoát toàn màn hình';
  } else {
    // Không ở chế độ toàn màn hình - hiển thị icon vào
    fullscreenBtn.innerHTML = `
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-.5.5h-1a.5.5 0 0 0 0 1H1v1a.5.5 0 0 0 1 0V7h1a.5.5 0 0 0 0-1H1V1.5a.5.5 0 0 0-.5-.5z"/>
        <path d="M14.5 1a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h1a.5.5 0 0 1 0 1H16v1a.5.5 0 0 1-1 0V7h-1a.5.5 0 0 1 0-1h1V1.5a.5.5 0 0 1 .5-.5z"/>
      </svg>
    `;
    fullscreenBtn.title = 'Toàn màn hình';
  }
}

// Hàm gộp các xe đã chọn thành nhóm
function groupSelectedCars() {
  console.log('groupSelectedCars called');
  console.log('selectedIds:', selectedIds);
  console.log('selectedIds.size:', selectedIds.size);
  
  if (selectedIds.size < 2) {
    showToast('Cần chọn ít nhất 2 xe để gộp thành nhóm!', 'warning');
    return;
  }

  // Lấy danh sách xe đã chọn
  const selectedCars = carList.filter(car => selectedIds.has(car.id));
  
  // Kiểm tra logic gộp nhóm thông minh
  const carsWithGroup = selectedCars.filter(car => car.groupId);
  const carsWithoutGroup = selectedCars.filter(car => !car.groupId);
  
  // Lấy danh sách các nhóm khác nhau
  const uniqueGroups = new Set();
  carsWithGroup.forEach(car => {
    if (car.groupId) {
      uniqueGroups.add(car.groupId);
    }
  });
  
  let targetGroupId = null;
  let targetGroupColor = null;
  
  if (uniqueGroups.size > 1) {
    // Có xe từ nhiều nhóm khác nhau
    const groupNames = Array.from(uniqueGroups).map(groupId => {
      const groupCars = carsWithGroup.filter(car => car.groupId === groupId);
      return `Nhóm ${groupId} (${groupCars.length} xe)`;
    }).join(', ');
    
    const confirmMessage = `Các xe đã chọn thuộc ${uniqueGroups.size} nhóm khác nhau:\n${groupNames}\n\nBạn có muốn gộp tất cả vào nhóm đầu tiên không?`;
    
    if (!confirm(confirmMessage)) {
      showToast('Đã hủy gộp xe!', 'info');
      return;
    }
    
    // Sử dụng nhóm đầu tiên làm nhóm đích
    const firstGroupId = Array.from(uniqueGroups)[0];
    const firstGroupCar = carsWithGroup.find(car => car.groupId === firstGroupId);
    targetGroupId = firstGroupCar.groupId;
    targetGroupColor = firstGroupCar.groupColor;
    
  } else if (uniqueGroups.size === 1) {
    // Tất cả xe có nhóm đều cùng một nhóm
    const firstGroupedCar = carsWithGroup[0];
    targetGroupId = firstGroupedCar.groupId;
    targetGroupColor = firstGroupedCar.groupColor;
    
  } else {
    // Tất cả xe đều chưa có nhóm, tạo nhóm mới
    targetGroupId = Date.now();
    targetGroupColor = getNextAvailableGroupColor();
  }

  // Cập nhật tất cả xe đã chọn với cùng groupId và groupColor
  selectedCars.forEach(car => {
    car.groupId = targetGroupId;
    car.groupColor = targetGroupColor;
  });

  // Cập nhật giao diện
  renderCarList();
  updateSelectionBar();
  
  // Lưu vào Firebase
  saveCarListToStorage(false);
  
  const groupInfo = uniqueGroups.size > 1 ? 
    `đã gộp ${selectedCars.length} xe từ ${uniqueGroups.size} nhóm khác nhau` : 
    `đã gộp ${selectedCars.length} xe thành một nhóm`;
  
  showToast(groupInfo, 'success');
}

// Hàm tách nhóm các xe đã chọn
function ungroupSelectedCars() {
  if (selectedIds.size === 0) {
    showToast('Vui lòng chọn ít nhất một xe để tách nhóm!', 'warning');
    return;
  }

  // Lấy danh sách xe đã chọn
  const selectedCars = carList.filter(car => selectedIds.has(car.id));
  
  // Kiểm tra xem có xe nào có nhóm không
  const carsWithGroup = selectedCars.filter(car => car.groupId);
  if (carsWithGroup.length === 0) {
    showToast('Các xe đã chọn chưa có nhóm!', 'warning');
    return;
  }

  // Tách nhóm cho tất cả xe đã chọn
  selectedCars.forEach(car => {
    car.groupId = null;
    car.groupColor = null;
  });

  // Cập nhật giao diện
  renderCarList();
  updateSelectionBar();
  
  // Lưu vào Firebase
  saveCarListToStorage(false);
  
  showToast(`Đã tách nhóm cho ${selectedCars.length} xe!`, 'success');
}

// Hàm lấy màu nhóm tiếp theo (không trùng với nhóm xe đi chung)
function getNextAvailableGroupColor() {
  // Màu sắc cho nhóm xe đi chung (khác với nhóm xe đã ra)
  const groupColors = [
    '#1e88e5', // blue 600
    '#8e24aa', // purple 600
    '#f4511e', // deep orange 600
    '#3949ab', // indigo 600
    '#c2185b', // pink 700
    '#2e7d32', // green 800
    '#d32f2f', // red 700
    '#f57c00', // orange 700
    '#5d4037', // brown 700
    '#455a64', // blue grey 700
  ];

  // Lấy danh sách màu đã sử dụng
  const usedColors = new Set();
  carList.forEach(car => {
    if (car.groupColor) {
      usedColors.add(car.groupColor);
    }
  });

  // Tìm màu chưa sử dụng
  for (const color of groupColors) {
    if (!usedColors.has(color)) {
      return color;
    }
  }

  // Nếu tất cả màu đã dùng, quay lại màu đầu tiên
  return groupColors[0];
}