// Multiple Car Selection - Chọn nhiều xe cùng lúc
class MultipleCarSelection {
  constructor() {
    this.selectedCars = new Set(); // Lưu các xe đã chọn
    this.carGroups = []; // Lưu cấu hình menu xe từ car menu editor
    this.activeTabId = 'all';
    this.panelOpen = false;
    this.panelMinimized = false;
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
    const openBtn = document.getElementById('openCarMenuBtn');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        // Nếu menu đang mở thì click nút cũng sẽ ẩn (minimize)
        if (this.panelOpen && !this.panelMinimized) {
          this.minimizePanel();
          return;
        }
        this.openPanel();
      });
    }

    // Click bất kỳ đâu ngoài sheet (kể cả topbar/bottombar) -> ẩn menu (giữ selection)
    const handleGlobalPointerDown = (e) => {
      if (!this.panelOpen || this.panelMinimized) return;
      const sheet = document.getElementById('carMenuSheet');
      if (sheet && sheet.contains(e.target)) return;
      this.minimizePanel();
    };
    document.addEventListener('pointerdown', handleGlobalPointerDown, { capture: true });

    const closeBtn = document.getElementById('carMenuCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closePanel());
    }

    const minimizeBtn = document.getElementById('carMenuMinimizeBtn');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => this.minimizePanel());
    }
  }

  openPanel() {
    this.loadCarGroups();
    // Nếu editor vừa mới khởi tạo async từ Firebase, đợi 1 tick rồi load lại để lấy màu/tên mới nhất.
    if (window.carMenuEditor) {
      setTimeout(() => {
        this.loadCarGroups();
        this.renderTabs();
        this.renderSelectionInterface();
        this.updateSelectedCount();
      }, 0);
    }
    this.activeTabId = 'all';
    this.panelOpen = true;
    this.panelMinimized = false;
    this.syncPanelVisibility();
    this.renderTabs();
    this.renderSelectionInterface();
    this.updateSelectedCount();
  }

  closePanel() {
    this.panelOpen = false;
    this.panelMinimized = false;
    this.selectedCars.clear();
    this.activeTabId = 'all';
    this.syncPanelVisibility();
    this.updateSelectedCount();
  }

  minimizePanel() {
    if (!this.panelOpen) return;
    this.panelMinimized = true;
    this.syncPanelVisibility();
  }

  syncPanelVisibility() {
    const panel = document.getElementById('carMenuPanel');
    if (!panel) return;
    const shouldOpen = this.panelOpen && !this.panelMinimized;
    panel.classList.toggle('open', shouldOpen);
    panel.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
  }

  setActiveTab(tabId) {
    this.activeTabId = tabId || 'all';
    this.renderTabs();
    this.renderSelectionInterface();
    this.updateSelectedCount();
  }

  getNormalizedGroups() {
    const groups = Array.isArray(this.carGroups) ? this.carGroups : [];
    return groups.map((g, idx) => {
      const name = (g && typeof g.name === 'string' && g.name.trim()) ? g.name.trim() : `Nhóm ${idx + 1}`;
      const cars = (g && Array.isArray(g.cars)) ? g.cars : [];
      const color = (g && typeof g.color === 'string') ? g.color : '';
      return { id: `g${idx}`, name, cars, color, _index: idx };
    });
  }

  getAllCarsList() {
    const seen = new Set();
    const result = [];
    const groups = this.getNormalizedGroups();
    groups.forEach(group => {
      group.cars.forEach(car => {
        if (seen.has(car)) return;
        seen.add(car);
        result.push({ car, group });
      });
    });
    return result;
  }

  renderTabs() {
    const tabsEl = document.getElementById('carMenuTabs');
    if (!tabsEl) return;

    const groups = this.getNormalizedGroups();
    const tabs = [
      { id: 'all', label: 'All', color: '' },
      ...groups.map(g => ({ id: g.id, label: g.name, color: g.color }))
    ];

    tabsEl.innerHTML = tabs.map(t => {
      const isActive = this.activeTabId === t.id;
      const bg = t.color || '';
      const text = bg ? this.getContrastingTextColor(bg) : '';
      const style = bg ? `style="background-color:${bg};color:${text};border-color:${bg}"` : '';
      return `<button class="car-menu-tab${isActive ? ' active' : ''}" ${style} type="button" onclick="window.multipleCarSelection && window.multipleCarSelection.setActiveTab('${t.id}')">${t.label}</button>`;
    }).join('');
  }

  // Render giao diện chọn xe (giống menu cũ)
  renderSelectionInterface() {
    const container = document.getElementById('multipleCarSelectionContainer');
    if (!container) return;

    const groups = this.getNormalizedGroups();
    const outSet = (window.getActiveOutCarCodes && window.getActiveOutCarCodes()) || new Set();

    const isAllTab = this.activeTabId === 'all';
    let carsToRender = [];
    if (!isAllTab) {
      const group = groups.find(g => g.id === this.activeTabId);
      carsToRender = (group ? group.cars : []).map(car => ({ car, group }));
    }

    container.innerHTML = `
      <div class="mb-2">
        <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap" style="gap:8px;">
          <span style="color: rgba(255,255,255,0.85);">Đã chọn: <span id="selectedCount">0</span> xe</span>
          <div class="d-flex" style="gap:8px;">
            <button class="btn btn-sm btn-outline-primary" type="button" onclick="multipleCarSelection.selectAllCarsInCurrentTab()">Chọn tất cả</button>
            <button class="btn btn-sm btn-outline-secondary" type="button" onclick="multipleCarSelection.clearAllSelection()">Bỏ chọn</button>
          </div>
        </div>
      </div>
      ${
        isAllTab
          ? groups.filter(g => Array.isArray(g.cars) && g.cars.length > 0).map(g => `
              <div class="mb-2 d-flex flex-wrap" style="gap:0;">
                ${g.cars.map(car => this.renderCarFromGroup(car, g, outSet)).join('')}
              </div>
            `).join('')
          : `
              <div class="mb-2 d-flex flex-wrap" style="gap:0;">
                ${carsToRender.map(({ car, group }) => this.renderCarFromGroup(car, group, outSet)).join('')}
              </div>
            `
      }
      ${
        isAllTab
          ? (groups.filter(g => Array.isArray(g.cars) && g.cars.length > 0).length === 0 ? '<p class="text-muted text-center">Chưa có nhóm xe nào.</p>' : '')
          : (carsToRender.length === 0 ? '<p class="text-muted text-center">Chưa có xe trong tab này.</p>' : '')
      }
    `;
  }

  renderCarFromGroup(car, group, outSet) {
    const isSelected = this.selectedCars.has(car);
    const bg = (group && group.color) ? group.color : '';
    const color = bg ? this.getContrastingTextColor(bg) : '';
    const style = bg ? `style=\"background-color:${bg};color:${color};border-color:${bg}\"` : '';
    const isOut = outSet.has(car);
    const outClass = isOut ? ' btn-car-out' : '';
    const baseClass = (!bg ? 'btn-secondary ' : '');
    const classes = isOut
      ? `btn btn-secondary m-1${isSelected ? ' selected' : ''}`
      : `btn ${baseClass}m-1${isSelected ? ' selected' : ''}`;
    const appliedStyle = isOut
      ? 'style="background-color:#3a3a3a;color:#bdbdbd;border-color:#4a4a4a"'
      : style;
    return `
      <button class="${classes}${outClass}" 
              ${appliedStyle}
              onclick="multipleCarSelection.toggleCarSelection('${car}')"
              data-car-code="${car}">
        ${car}
      </button>
    `;
  }

  selectAllCarsInCurrentTab() {
    const groups = this.getNormalizedGroups();
    const cars = this.activeTabId === 'all'
      ? this.getAllCarsList().map(x => x.car)
      : ((groups.find(g => g.id === this.activeTabId)?.cars) || []);

    cars.forEach(car => {
      if (!this.selectedCars.has(car)) {
        this.selectedCars.add(car);
      }
    });

    this.renderSelectionInterface();
    this.updateSelectedCount();
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

  /** Màu nhóm khi gộp: Firebase (index_new) hoặc fallback palette + localStorage */
  async resolveMergeGroupColor() {
    if (typeof window.pickNextMergeGroupColorFromDb === 'function') {
      try {
        const c = await window.pickNextMergeGroupColorFromDb();
        if (c) return c;
      } catch (e) {
        console.warn('resolveMergeGroupColor', e);
      }
    }
    let idx = Number(localStorage.getItem(this.groupColorIndexKey));
    if (Number.isNaN(idx) || idx < 0) idx = 0;
    const color = this.groupColorPalette[idx % this.groupColorPalette.length];
    localStorage.setItem(this.groupColorIndexKey, String((idx + 1) % this.groupColorPalette.length));
    return color;
  }

  // Thêm các xe đã chọn vào danh sách (hàm cũ - giữ để tương thích)
  async addSelectedCars() {
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
      const groupId = Date.now();
      const color = await this.resolveMergeGroupColor();
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
    this.minimizePanel();

    // Hiển thị thông báo
    if (typeof showToast === 'function') {
      showToast(`Đã thêm ${this.selectedCars.size} xe vào danh sách!`, 'success');
    }

    // Reset selection
    this.selectedCars.clear();
  }

  // Thêm các xe đã chọn thành một nhóm
  async addSelectedCarsAsGroup() {
    if (this.selectedCars.size < 2) {
      if (typeof showToast === 'function') {
        showToast('Cần chọn ít nhất 2 xe để gộp thành nhóm!', 'warning');
      }
      return;
    }

    const groupId = Date.now();
    const color = await this.resolveMergeGroupColor();
    const groupMeta = { groupId, groupColor: color };

    // Thêm 1 lần để tránh overwrite (batch write)
    const codes = Array.from(this.selectedCars);
    if (typeof window.addCarsBatch === 'function') {
      window.addCarsBatch(codes, groupMeta);
    } else if (typeof addCar === 'function') {
      // Fallback: gọi tuần tự (kém an toàn hơn nếu addCar dùng set())
      codes.forEach(carCode => addCar(carCode, groupMeta));
    }

    this.minimizePanel();

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

    const codes = Array.from(this.selectedCars);
    if (typeof window.addCarsBatch === 'function') {
      window.addCarsBatch(codes, null);
    } else if (typeof addCar === 'function') {
      codes.forEach(carCode => addCar(carCode));
    }

    this.minimizePanel();

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
      // Ưu tiên chữ đen nhiều hơn (chỉ dùng trắng khi nền rất tối)
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b; // 0..255
      return luminance > 120 ? '#000000' : '#ffffff';
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
