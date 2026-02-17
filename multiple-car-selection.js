// Multiple Car Selection - Chọn nhiều xe cùng lúc
class MultipleCarSelection {
  constructor() {
    this.selectedCars = new Set(); // Lưu các xe đã chọn
    this.carGroups = []; // Lưu cấu hình menu xe từ car menu editor
    // Bảng màu tương phản để tô nhóm Mã xe (ưu tiên dễ đọc trên nền đỏ/xanh/vàng)
    this.groupColorPalette = [
      '#1e88e5', // blue 600
      //'#8e24aa', // purple 600
      //'#f4511e', // deep orange 600 loại dòng này vì khi xe hết giờ bị trùng màu khó nhìn 
      '#3949ab', // indigo 600
      '#840035', // pink 700 dòng này đang giảm màu để đỡ chói khi hàng màu đỏ xe hết giờ
      '#2e7d32', // green 800 (dark enough on yellow)
    ];
    this.groupColorIndexKey = 'groupColorIndex';
    this.init();
  }
 
  init() {
    this.loadCarGroups();
    this.setupEventListeners();
  } 

  // Lấy cấu hình menu xe từ car menu editor
  loadCarGroups() {
    if (window.carMenuEditor && window.carMenuEditor.carGroups) {
      this.carGroups = window.carMenuEditor.carGroups;
    } else {
      // Fallback về cấu hình mặc định nếu chưa có car menu editor
      this.carGroups = [
        {
          name: 'Nhóm A',
          cars: ['A1', 'A12', 'A13', 'A14', 'A15', 'A16', 'A17', 'A18', 'A19', 'A20', 'AB']
        },
        {
          name: 'Nhóm C', 
          cars: ['C1', 'C2', 'C3', 'C4', 'CC', 'CX']
        },
        {
          name: 'Nhóm M',
          cars: ['M1', 'M2', 'M3', 'D3']
        },
        {
          name: 'Nhóm X',
          cars: ['XĐ', 'XT', 'XV']
        },
        {
          name: 'Nhóm S',
          cars: ['S1', 'S2', 'S3', 'S4']
        },
        {
          name: 'Nhóm số',
          cars: ['03', '06', '09', '10', '25']
        },
        {
          name: 'Nhóm đặc biệt',
          cars: ['ĐM', 'ĐC', 'VH']
        }
      ];
    }
  }

  // Thiết lập event listeners
  setupEventListeners() {
    // Nút thêm xe đã chọn
    const addSelectedCarsBtn = document.getElementById('addSelectedCarsBtn');
    if (addSelectedCarsBtn) {
      addSelectedCarsBtn.addEventListener('click', () => this.addSelectedCars());
    }

    // Khi mở modal chọn nhiều xe
    const selectMultipleModal = document.getElementById('selectMultipleModal');
    if (selectMultipleModal) {
      selectMultipleModal.addEventListener('show.bs.modal', () => {
        this.onModalOpen();
      });
    }
  }

  // Khi mở modal
  onModalOpen() {
    this.loadCarGroups(); // Cập nhật lại cấu hình menu xe
    this.selectedCars.clear(); // Reset danh sách chọn
    this.renderSelectionInterface();
    this.updateSelectedCount();
  }

  // Render giao diện chọn xe (giống menu cũ)
  renderSelectionInterface() {
    const container = document.getElementById('multipleCarSelectionContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="mb-2">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span>Đã chọn: <span id="selectedCount">0</span> xe</span>
          <div>
            <button class="btn btn-sm btn-outline-primary" onclick="multipleCarSelection.selectAllCars()">Chọn tất cả</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="multipleCarSelection.clearAllSelection()">Bỏ chọn tất cả</button>
          </div>
        </div>
      </div>
      ${this.carGroups.map((group, groupIndex) => this.renderGroup(group, groupIndex)).join('')}
      ${this.carGroups.length === 0 ? '<p class="text-muted text-center">Chưa có nhóm xe nào.</p>' : ''}
    `;
  }

  // Render một nhóm xe (giống menu cũ)
  renderGroup(group, groupIndex) {
    return `
      <div class="mb-2">
        ${group.cars.map((car, carIndex) => this.renderCar(car, groupIndex, carIndex)).join('')}
      </div>
    `;
  }

  // Render một xe (giống menu cũ nhưng có checkbox)
  renderCar(car, groupIndex, carIndex) {
    const isSelected = this.selectedCars.has(car);
    const group = this.carGroups[groupIndex] || {};
    const bg = group.color || '';
    const color = bg ? this.getContrastingTextColor(bg) : '';
    const style = bg ? `style=\"background-color:${bg};color:${color};border-color:${bg}\"` : '';
    const outSet = (window.getActiveOutCarCodes && window.getActiveOutCarCodes()) || new Set();
    const isOut = outSet.has(car);
    const outClass = isOut ? ' btn-car-out' : '';
    const baseClass = (!bg ? 'btn-secondary ' : '');
    const classes = isOut ? `btn m-1${isSelected ? ' selected' : ''}` : `btn ${baseClass}m-1${isSelected ? ' selected' : ''}`;
    const appliedStyle = isOut ? '' : style;
    return `
      <button class="${classes}${outClass}" 
              ${appliedStyle}
              onclick="multipleCarSelection.toggleCarSelection('${car}')"
              data-car-code="${car}">
        ${car}
      </button>
    `;
  }

  // Toggle chọn/bỏ chọn một xe
  toggleCarSelection(carCode) {
    const button = document.querySelector(`button[data-car-code="${carCode}"]`);
    
    if (this.selectedCars.has(carCode)) {
      this.selectedCars.delete(carCode);
      if (button) {
        button.classList.remove('selected');
        if (!button.getAttribute('style')) {
          button.classList.remove('btn-primary');
          button.classList.add('btn-secondary');
        }
      }
    } else {
      this.selectedCars.add(carCode);
      if (button) {
        button.classList.add('selected');
        if (!button.getAttribute('style')) {
          button.classList.remove('btn-secondary');
          button.classList.add('btn-primary');
        }
      }
    }
    
    this.updateSelectedCount();
  }

  // Chọn tất cả xe
  selectAllCars() {
    this.carGroups.forEach((group, groupIndex) => {
      group.cars.forEach((car, carIndex) => {
        if (!this.selectedCars.has(car)) {
          this.selectedCars.add(car);
          const button = document.querySelector(`button[data-car-code="${car}"]`);
          if (button) {
            button.classList.add('selected');
            if (!button.getAttribute('style')) {
              button.classList.remove('btn-secondary');
              button.classList.add('btn-primary');
            }
          }
        }
      });
    });

    this.updateSelectedCount();
  }

  // Bỏ chọn tất cả xe
  clearAllSelection() {
    this.selectedCars.clear();
    
    // Reset tất cả button về trạng thái không chọn
    const buttons = document.querySelectorAll('button[data-car-code]');
    buttons.forEach(button => {
      button.classList.remove('selected');
      if (!button.getAttribute('style')) {
        button.classList.remove('btn-primary');
        button.classList.add('btn-secondary');
      }
    });

    this.updateSelectedCount();
  }

  // Cập nhật số lượng xe đã chọn
  updateSelectedCount() {
    const selectedCountElement = document.getElementById('selectedCount');
    
    if (selectedCountElement) {
      selectedCountElement.textContent = this.selectedCars.size;
    }

    // Also sync floating bar buttons in modal if present
    try {
      const groupBtn = document.getElementById('multiSelectGroupBtn');
      const addBtn = document.getElementById('multiSelectAddBtn');
      if (groupBtn) groupBtn.disabled = this.selectedCars.size < 2;
      if (addBtn) addBtn.disabled = this.selectedCars.size === 0;
    } catch (_) {}
  }

  // Thêm các xe đã chọn vào danh sách (hàm cũ - giữ để tương thích)
  addSelectedCars() {
    if (this.selectedCars.size === 0) {
      if (typeof showToast === 'function') {
        showToast('Vui lòng chọn ít nhất một xe!', 'warning');
      }
      return;
    }

    // Hỏi có đi chung không
    const isGrouped = confirm('Các xe này có đi chung không?');

    let groupMeta = null;
    if (isGrouped) {
      // Tạo group id và lấy màu kế tiếp trong bảng màu (lưu chỉ số vào localStorage để xoay vòng)
      const groupId = Date.now();
      let idx = Number(localStorage.getItem(this.groupColorIndexKey));
      if (Number.isNaN(idx) || idx < 0) idx = 0;
      const color = this.groupColorPalette[idx % this.groupColorPalette.length];
      localStorage.setItem(this.groupColorIndexKey, String((idx + 1) % this.groupColorPalette.length));
      groupMeta = { groupId, groupColor: color };
    }

    // Thêm từng xe đã chọn
    this.selectedCars.forEach(carCode => {
      if (typeof addCar === 'function') {
        if (groupMeta) {
          addCar(carCode, groupMeta);
        } else {
          addCar(carCode);
        }
      }
    });

    // Đóng modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('selectMultipleModal'));
    if (modal) {
      modal.hide();
    }

    // Hiển thị thông báo
    if (typeof showToast === 'function') {
      showToast(`Đã thêm ${this.selectedCars.size} xe vào danh sách!`, 'success');
    }

    // Reset selection
    this.selectedCars.clear();
  }

  // Thêm các xe đã chọn thành một nhóm
  addSelectedCarsAsGroup() {
    if (this.selectedCars.size < 2) {
      if (typeof showToast === 'function') {
        showToast('Cần chọn ít nhất 2 xe để gộp thành nhóm!', 'warning');
      }
      return;
    }

    // Tạo group id và lấy màu kế tiếp trong bảng màu
    const groupId = Date.now();
    let idx = Number(localStorage.getItem(this.groupColorIndexKey));
    if (Number.isNaN(idx) || idx < 0) idx = 0;
    const color = this.groupColorPalette[idx % this.groupColorPalette.length];
    localStorage.setItem(this.groupColorIndexKey, String((idx + 1) % this.groupColorPalette.length));
    const groupMeta = { groupId, groupColor: color };

    // Thêm từng xe đã chọn với cùng group meta
    this.selectedCars.forEach(carCode => {
      if (typeof addCar === 'function') {
        addCar(carCode, groupMeta);
      }
    });

    // Đóng modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('selectMultipleModal'));
    if (modal) {
      modal.hide();
    }

    // Hiển thị thông báo
    if (typeof showToast === 'function') {
      showToast(`Đã gộp ${this.selectedCars.size} xe thành một nhóm!`, 'success');
    }

    // Reset selection
    this.selectedCars.clear();
  }

  // Thêm các xe đã chọn riêng lẻ (không gộp)
  addSelectedCarsIndividually() {
    if (this.selectedCars.size === 0) {
      if (typeof showToast === 'function') {
        showToast('Vui lòng chọn ít nhất một xe!', 'warning');
      }
      return;
    }

    // Thêm từng xe đã chọn riêng lẻ
    this.selectedCars.forEach(carCode => {
      if (typeof addCar === 'function') {
        addCar(carCode);
      }
    });

    // Đóng modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('selectMultipleModal'));
    if (modal) {
      modal.hide();
    }

    // Hiển thị thông báo
    if (typeof showToast === 'function') {
      showToast(`Đã thêm ${this.selectedCars.size} xe riêng lẻ vào danh sách!`, 'success');
    }

    // Reset selection
    this.selectedCars.clear();
  }

  // Tính màu chữ tương phản (đen hoặc trắng) dựa vào nền
  getContrastingTextColor(hexColor) {
    try {
      const hex = hexColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      return luminance > 186 ? '#000000' : '#ffffff';
    } catch (e) {
      return '#ffffff';
    }
  }
}

// Khởi tạo multiple car selection khi trang load
let multipleCarSelection;
document.addEventListener('DOMContentLoaded', function() {
  multipleCarSelection = new MultipleCarSelection();
  window.multipleCarSelection = multipleCarSelection; // Để có thể truy cập từ script.js
}); 
