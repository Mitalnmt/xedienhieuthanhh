// Multiple Car Selection - Chọn nhiều xe cùng lúc
class MultipleCarSelection {
  constructor() {
    this.selectedCars = new Set(); // Lưu các xe đã chọn
    this.carGroups = []; // Lưu cấu hình menu xe từ car menu editor
    this.activeTabId = 'all';
    this.panelOpen = false;
    this.panelMinimized = false;
    // Swipe gesture state
    this.swipeStartX = 0;
    this.swipeStartY = 0;
    this.swipeThreshold = 80;
    // Change car mode - khi đổi xe từ 1 xe đang có
    this.isChangeCarMode = false;
    this.changeCarRowIndex = null;
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
      openBtn.addEventListener('pointerdown', (e) => {
        e.stopImmediatePropagation();
      }, true); // Capture phase
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Nếu menu đang mở thì click nút cũng sẽ ẩn (minimize)
        if (this.panelOpen && !this.panelMinimized) {
          this.minimizePanel();
          return;
        }
        // Nếu menu đang minimized thì hiện lại
        if (this.panelOpen && this.panelMinimized) {
          this.showPanelFromMinimized();
          return;
        }
        this.openPanel();
      });
    }

    // Bottombar action buttons - stop propagation để không bị swallow bởi swipe gesture
    const groupBtn = document.getElementById('bottomBarGroupBtn');
    if (groupBtn) {
      groupBtn.addEventListener('pointerdown', (e) => {
        e.stopImmediatePropagation();
      }, true); // Capture phase
      groupBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.addSelectedCarsAsGroup();
      });
    }
    const addBtn = document.getElementById('bottomBarAddBtn');
    if (addBtn) {
      addBtn.addEventListener('pointerdown', (e) => {
        e.stopImmediatePropagation();
      }, true); // Capture phase
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.addSelectedCarsIndividually();
      });
    }

    // Click bất kỳ đâu ngoài sheet (kể cả topbar/bottombar) -> ẩn menu (giữ selection)
    const handleGlobalPointerDown = (e) => {
      if (!this.panelOpen || this.panelMinimized) return;
      const sheet = document.getElementById('carMenuSheet');
      if (sheet && sheet.contains(e.target)) return;
      // Không minimize khi click vào bottom bar actions hoặc nút Chọn Xe
      const bottomBar = document.querySelector('.bottom-bar');
      if (bottomBar && bottomBar.contains(e.target)) return;
      this.minimizePanel();
    };
    document.addEventListener('pointerdown', handleGlobalPointerDown, { capture: true });

    // Swipe gesture cho bottombar - vuốt trái/phải sang để đóng menu
    this.setupBottombarSwipe();
    
    // Click vào vùng trống bottombar để đóng menu
    this.setupBottombarClickToClose();

    const closeBtn = document.getElementById('carMenuCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closePanel());
    }

    const minimizeBtn = document.getElementById('carMenuMinimizeBtn');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => this.minimizePanel());
    }
  }

  // Thiết lập swipe gesture cho bottombar
  setupBottombarSwipe() {
    const swipeZone = document.getElementById('bottombarSwipeZone');
    if (!swipeZone) return;

    swipeZone.addEventListener('pointerdown', (e) => {
      this.swipeStartX = e.clientX;
      this.swipeStartY = e.clientY;
    });

    swipeZone.addEventListener('pointerup', (e) => {
      if (!this.panelOpen || this.panelMinimized) return;
      
      const dx = e.clientX - this.swipeStartX;
      const dy = Math.abs(e.clientY - this.swipeStartY);
      
      // Vuốt từ trái sang phải HOẶC phải sang trái với đủ khoảng cách và không phải vuốt dọc
      if (Math.abs(dx) > this.swipeThreshold && dy < 60) {
        this.minimizePanel();
      }
    });
  }

  // Thiết lập click vào vùng trống bottombar để đóng menu
  setupBottombarClickToClose() {
    const bottomBar = document.querySelector('.bottom-bar');
    if (!bottomBar) return;

    bottomBar.addEventListener('pointerdown', (e) => {
      if (!this.panelOpen || this.panelMinimized) return;
      
      // Kiểm tra nếu click vào các buttons thì bỏ qua
      if (e.target.closest('button') || e.target.closest('.action-btn')) return;
      
      // Click vào vùng trống bottom bar để đóng menu
      this.minimizePanel();
    });
  }

  // Cập nhật animation khi mở/đóng menu
  updateBottomBarAnimation(open) {
    const openBtn = document.getElementById('openCarMenuBtn');
    const bottomBarActions = document.getElementById('bottomBarActions');
    const body = document.body;

    if (open) {
      // Mở menu: nút Chọn Xe slide out và ẩn, actions slide in hiện ra
      openBtn.classList.add('slide-out');
      body.classList.add('car-menu-open');
      
      setTimeout(() => {
        openBtn.classList.remove('slide-out');
        openBtn.classList.add('hidden');
        bottomBarActions.classList.add('slide-in');
      }, 200);
    } else {
      // Đóng menu: actions slide out và ẩn, nút Chọn Xe slide in hiện lại
      bottomBarActions.classList.remove('slide-in');
      bottomBarActions.classList.add('slide-out');
      
      setTimeout(() => {
        bottomBarActions.classList.remove('slide-out');
        bottomBarActions.classList.remove('visible');
        openBtn.classList.remove('hidden');
        openBtn.classList.add('slide-in');
        
        setTimeout(() => {
          openBtn.classList.remove('slide-in');
        }, 300);
      }, 200);
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
    this.updateBottomBarAnimation(true);
  }

  closePanel() {
    this.panelOpen = false;
    this.panelMinimized = false;
    this.selectedCars.clear();
    this.activeTabId = 'all';
    this.syncPanelVisibility();
    this.updateSelectedCount();
    this.updateBottomBarAnimation(false);
    // Disable action buttons when panel is fully closed
    try {
      const groupBtn = document.getElementById('bottomBarGroupBtn');
      const addBtn = document.getElementById('bottomBarAddBtn');
      if (groupBtn) groupBtn.disabled = true;
      if (addBtn) addBtn.disabled = true;
    } catch (_) {}
  }

  minimizePanel() {
    if (!this.panelOpen) return;
    this.panelMinimized = true;
    this.syncPanelVisibility();
    this.updateBottomBarAnimation(false);
  }

  // Xóa tất cả xe đã chọn và hiệu ứng
  clearSelectedCars() {
    this.selectedCars.clear();
    this.renderSelectionInterface();
    this.updateSelectedCount();
    
    // Xóa hiệu ứng rainbow trên car items trong menu
    document.querySelectorAll('.car-item.selected, .car-item-tile.selected').forEach(el => {
      el.classList.remove('selected', 'rainbow-pulse');
    });
    
    // Xóa hiệu ứng rainbow trên car rows trong danh sách (mobile)
    if (typeof window.exitRowMultiSelect === 'function') {
      window.exitRowMultiSelect();
    }
  }

  // Hiện lại panel từ trạng thái minimized (bấm nút Chọn Xe)
  showPanelFromMinimized() {
    if (!this.panelOpen || !this.panelMinimized) return;
    this.panelMinimized = false;
    this.syncPanelVisibility();
    this.updateBottomBarAnimation(true);
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
    const carList = window.__carListCache || [];
    
    groups.forEach(group => {
      group.cars.forEach(carCode => {
        if (seen.has(carCode)) return;
        seen.add(carCode);
        
        // Lấy thông tin xe đầy đủ từ carList
        const carInfo = carList.find(c => c && c.carCode === carCode) || { carCode };
        
        result.push({ car: carCode, group, carInfo });
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
    const carList = window.__carListCache || [];

    const isAllTab = this.activeTabId === 'all';
    let carsToRender = [];
    if (!isAllTab) {
      const group = groups.find(g => g.id === this.activeTabId);
      carsToRender = (group ? group.cars : []).map(carCode => {
        const carInfo = carList.find(c => c && c.carCode === carCode) || { carCode };
        return { car: carCode, group, carInfo };
      });
    }

    // Header text khác nhau cho change car mode
    const headerText = this.isChangeCarMode 
      ? `<span style="color: rgba(255,255,255,0.7);">Chọn xe mới để thay thế</span>`
      : `<span style="color: rgba(255,255,255,0.85);">Đã chọn: <span id="selectedCount">0</span> xe</span>`;

    const actionButtonsHtml = this.isChangeCarMode
      ? '' // Không hiện nút chọn tất cả / bỏ chọn khi đổi xe
      : `<div class="d-flex justify-content-between align-items-center mb-2 flex-wrap" style="gap:8px;">
          ${headerText}
          <div class="d-flex" style="gap:8px;">
            <button class="btn btn-sm btn-outline-primary" type="button" onclick="multipleCarSelection.selectAllCarsInCurrentTab()">Chọn tất cả</button>
            <button class="btn btn-sm btn-outline-secondary" type="button" onclick="multipleCarSelection.clearAllSelection()">Bỏ chọn</button>
          </div>
        </div>`;

    container.innerHTML = `
      <div class="mb-2">
        ${actionButtonsHtml}
      </div>
      ${
        isAllTab
          ? groups.filter(g => Array.isArray(g.cars) && g.cars.length > 0).map(g => `
              <div class="mb-2 d-flex flex-wrap" style="gap:0;">
                ${g.cars.map(carCode => {
                  const carInfo = carList.find(c => c && c.carCode === carCode) || { carCode };
                  return this.renderCarFromGroup(carCode, g, outSet, carInfo);
                }).join('')}
              </div>
            `).join('')
          : `
              <div class="mb-2 d-flex flex-wrap" style="gap:0;">
                ${carsToRender.map(({ car, group, carInfo }) => this.renderCarFromGroup(car, group, outSet, carInfo)).join('')}
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

  renderCarFromGroup(car, group, outSet, carInfo) {
    const isSelected = this.selectedCars.has(car);
    const bg = (group && group.color) ? group.color : '';
    const color = bg ? this.getContrastingTextColor(bg) : '';
    const style = bg ? `style=\"background-color:${bg};color:${color};border-color:${bg}\"` : '';
    const isOut = outSet.has(car);
    // Xe ∞ (isNullTime) cũng được coi là "không thể chọn" - hiển thị mờ
    const isNullTime = carInfo && carInfo.isNullTime;
    const isDisabled = isOut || isNullTime;
    const outClass = isDisabled ? ' btn-car-out' : '';
    const baseClass = (!bg ? 'btn-secondary ' : '');
    const classes = isDisabled
      ? `btn btn-secondary m-1${isSelected ? ' selected' : ''}`
      : `btn ${baseClass}m-1${isSelected ? ' selected' : ''}`;
    const appliedStyle = isDisabled
      ? 'style="background-color:#3a3a3a;color:#bdbdbd;border-color:#4a4a4a"'
      : style;
    return `
      <button class="${classes}${outClass}" 
              ${appliedStyle}
              onclick="multipleCarSelection.toggleCarSelection('${car}')"
              data-car-code="${car}">
        ${car}${isNullTime ? ' ∞' : ''}
      </button>
    `;
  }

  selectAllCarsInCurrentTab() {
    const groups = this.getNormalizedGroups();
    const carList = window.__carListCache || [];
    const cars = this.activeTabId === 'all'
      ? this.getAllCarsList()
      : ((groups.find(g => g.id === this.activeTabId)?.cars) || []).map(carCode => {
          const carInfo = carList.find(c => c && c.carCode === carCode) || { carCode };
          return { car: carCode, carInfo };
        });

    cars.forEach(item => {
      const carCode = item.car || item;
      if (!this.selectedCars.has(carCode)) {
        this.selectedCars.add(carCode);
      }
    });

    this.renderSelectionInterface();
    this.updateSelectedCount();
  }

  // Toggle chọn/bỏ chọn một xe
  toggleCarSelection(carCode) {
    // Nếu đang ở mode đổi xe -> đổi ngay lập tức mà không cần bấm nút
    if (this.isChangeCarMode && this.changeCarRowIndex !== null) {
      // Đợi applyChangeCarCode được export từ index.html nếu chưa sẵn sàng
      const applyFn = window.applyChangeCarCode;
      if (typeof applyFn === 'function') {
        applyFn(carCode);
      } else {
        // Thử đợi 1 tick rồi gọi lại
        setTimeout(() => {
          if (typeof window.applyChangeCarCode === 'function') {
            window.applyChangeCarCode(carCode);
          }
        }, 0);
      }
      this.minimizePanel();
      this.resetChangeCarMode();
      return;
    }

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

    // Sync bottombar action buttons
    try {
      const groupBtn = document.getElementById('bottomBarGroupBtn');
      const addBtn = document.getElementById('bottomBarAddBtn');
      
      if (this.isChangeCarMode) {
        // Change car mode: chỉ nút "Thêm" (đổi)
        if (groupBtn) {
          groupBtn.style.display = 'none';
          groupBtn.disabled = true;
        }
        if (addBtn) {
          addBtn.style.display = '';
          addBtn.disabled = this.selectedCars.size === 0;
          addBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Đổi';
        }
      } else {
        // Normal mode: hiện cả 2 nút
        if (groupBtn) {
          groupBtn.style.display = '';
          groupBtn.disabled = this.selectedCars.size < 2;
        }
        if (addBtn) {
          addBtn.style.display = '';
          addBtn.disabled = this.selectedCars.size === 0;
          addBtn.innerHTML = '<i class="fas fa-plus"></i> Thêm';
        }
      }
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

    // Hiển thị thông báo
    if (typeof showToast === 'function') {
      showToast(`Đã gộp ${this.selectedCars.size} xe thành một nhóm!`, 'success');
    }

    // Xóa selection và hiệu ứng TRƯỚC khi đóng menu
    this.clearSelectedCars();
    this.minimizePanel();
  }

  // Thêm các xe đã chọn riêng lẻ (không gộp)
  addSelectedCarsIndividually() {
    if (this.selectedCars.size === 0) {
      if (typeof showToast === 'function') {
        showToast('Vui lòng chọn ít nhất một xe!', 'warning');
      }
      return;
    }

    // Nếu đang ở mode đổi xe (chỉ chọn 1 xe)
    if (this.isChangeCarMode && this.changeCarRowIndex !== null) {
      const selectedCode = Array.from(this.selectedCars)[0];
      if (selectedCode && typeof window.applyChangeCarCode === 'function') {
        window.applyChangeCarCode(selectedCode);
      }
      this.minimizePanel();
      this.resetChangeCarMode();
      return;
    }

    const codes = Array.from(this.selectedCars);
    if (typeof window.addCarsBatch === 'function') {
      window.addCarsBatch(codes, null);
    } else if (typeof addCar === 'function') {
      codes.forEach(carCode => addCar(carCode));
    }

    // Hiển thị thông báo
    if (typeof showToast === 'function') {
      showToast(`Đã thêm ${this.selectedCars.size} xe riêng lẻ vào danh sách!`, 'success');
    }

    // Xóa selection và hiệu ứng TRƯỚC khi đóng menu
    this.clearSelectedCars();
    this.minimizePanel();
  }

  // Bật mode đổi xe
  enterChangeCarMode(rowIndex) {
    this.isChangeCarMode = true;
    this.changeCarRowIndex = rowIndex;
    this.selectedCars.clear();
    
    // Đồng bộ với changeCarState trong index.html
    if (typeof window.setChangeCarStateRowIndex === 'function') {
      window.setChangeCarStateRowIndex(rowIndex);
    }
    
    this.openPanel();
  }

  // Reset change car mode
  resetChangeCarMode() {
    this.isChangeCarMode = false;
    this.changeCarRowIndex = null;
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
