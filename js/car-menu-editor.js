// Car Menu Editor - Quản lý chỉnh sửa menu xe 
class CarMenuEditor {
  constructor() {
    this.carGroups = [
      {
        name: 'Nhóm A',
        cars: ['A1', 'A12', 'A13', 'A14', 'A15', 'A16', 'A17', 'A18', 'A19', 'A20', 'AB'],
        color: ''
      }, 
      {
        name: 'Nhóm C', 
        cars: ['C1', 'C2', 'C3', 'C4', 'CC', 'CX'],
        color: ''
      },
      {
        name: 'Nhóm M',
        cars: ['M1', 'M2', 'M3', 'D3'],
        color: ''
      },
      {
        name: 'Nhóm X',
        cars: ['XĐ', 'XT', 'XV'],
        color: ''
      },
      {
        name: 'Nhóm S',
        cars: ['S1', 'S2', 'S3', 'S4'],
        color: ''
      },
      {
        name: 'Nhóm số',
        cars: ['03', '06', '09', '10', '25'],
        color: ''
      },
      {
        name: 'Nhóm đặc biệt',
        cars: ['ĐM', 'ĐC', 'VH'],
        color: ''
      }
    ];
    
    this.init();
  }

  init() {
    this.loadFromStorage();
    this.setupEventListeners();
    this.setupFirebaseListener();
  }

  // Lưu cấu hình menu xe vào Firebase và localStorage
  saveToStorage() {
    // Lưu vào localStorage để truy cập nhanh
    localStorage.setItem('carMenuConfig', JSON.stringify(this.carGroups));
    
    // Lưu vào Firebase để đồng bộ giữa các thiết bị
    if (window.db) {
      window.db.ref('carMenuConfig').set(this.carGroups).then(() => {
        // Hiển thị thông báo đồng bộ thành công (chỉ khi có thay đổi lớn)
        if (typeof showToast === 'function') {
          showToast('Đã đồng bộ menu xe lên cloud!', 'success');
        }
        // Cập nhật multiple car selection
        this.updateMultipleCarSelection();
      }).catch((error) => {
        console.error('Lỗi khi lưu menu xe lên Firebase:', error);
        if (typeof showToast === 'function') {
          showToast('Lỗi khi đồng bộ menu xe!', 'danger');
        }
      });
    } else {
      // Cập nhật multiple car selection ngay cả khi không có Firebase
      this.updateMultipleCarSelection();
    }
  }

  // Tải cấu hình menu xe từ Firebase và localStorage
  loadFromStorage() {
    // Thử tải từ Firebase trước
    if (window.db) {
      window.db.ref('carMenuConfig').once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Chuẩn hóa để đảm bảo có field color
          this.carGroups = data.map(g => ({
            name: g.name,
            cars: Array.isArray(g.cars) ? g.cars : [],
            color: typeof g.color === 'string' ? g.color : ''
          }));
          this.renderEditor(); // Render lại nếu đang mở editor
        } else {
          // Nếu Firebase chưa có dữ liệu, thử từ localStorage
          const saved = localStorage.getItem('carMenuConfig');
          if (saved) {
            const parsed = JSON.parse(saved);
            this.carGroups = parsed.map(g => ({
              name: g.name,
              cars: Array.isArray(g.cars) ? g.cars : [],
              color: typeof g.color === 'string' ? g.color : ''
            }));
          }
        }
      }).catch((error) => {
        console.error('Lỗi khi tải menu xe từ Firebase:', error);
        // Fallback về localStorage
        const saved = localStorage.getItem('carMenuConfig');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.carGroups = parsed.map(g => ({
            name: g.name,
            cars: Array.isArray(g.cars) ? g.cars : [],
            color: typeof g.color === 'string' ? g.color : ''
          }));
        }
      });
    } else {
      // Fallback về localStorage nếu không có Firebase
      const saved = localStorage.getItem('carMenuConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.carGroups = parsed.map(g => ({
          name: g.name,
          cars: Array.isArray(g.cars) ? g.cars : [],
          color: typeof g.color === 'string' ? g.color : ''
        }));
      }
    }
  }

  // Lấy tất cả xe từ tất cả nhóm
  getAllCars() {
    return this.carGroups.flatMap(group => group.cars);
  }

  // Thêm xe mới vào nhóm
  addCar(groupIndex, carCode) {
    if (groupIndex >= 0 && groupIndex < this.carGroups.length) {
      carCode = carCode.trim().toUpperCase();
      if (carCode && !this.carGroups[groupIndex].cars.includes(carCode)) {
        this.carGroups[groupIndex].cars.push(carCode);
        this.saveToStorage();
        this.renderEditor();
        return true;
      }
    }
    return false;
  }

  // Xóa xe khỏi nhóm
  removeCar(groupIndex, carIndex) {
    if (groupIndex >= 0 && groupIndex < this.carGroups.length) {
      if (carIndex >= 0 && carIndex < this.carGroups[groupIndex].cars.length) {
        this.carGroups[groupIndex].cars.splice(carIndex, 1);
        this.saveToStorage();
        this.renderEditor();
        return true;
      }
    }
    return false;
  }

  // Sửa tên xe
  editCar(groupIndex, carIndex, newCarCode) {
    if (groupIndex >= 0 && groupIndex < this.carGroups.length) {
      if (carIndex >= 0 && carIndex < this.carGroups[groupIndex].cars.length) {
        newCarCode = newCarCode.trim().toUpperCase();
        if (newCarCode) {
          this.carGroups[groupIndex].cars[carIndex] = newCarCode;
          this.saveToStorage();
          this.renderEditor();
          return true;
        }
      }
    }
    return false;
  }

  // Di chuyển xe lên
  moveCarUp(groupIndex, carIndex) {
    if (groupIndex >= 0 && groupIndex < this.carGroups.length) {
      if (carIndex > 0 && carIndex < this.carGroups[groupIndex].cars.length) {
        const temp = this.carGroups[groupIndex].cars[carIndex];
        this.carGroups[groupIndex].cars[carIndex] = this.carGroups[groupIndex].cars[carIndex - 1];
        this.carGroups[groupIndex].cars[carIndex - 1] = temp;
        this.saveToStorage();
        this.renderEditor();
        return true;
      }
    }
    return false;
  }

  // Di chuyển xe xuống
  moveCarDown(groupIndex, carIndex) {
    if (groupIndex >= 0 && groupIndex < this.carGroups.length) {
      if (carIndex >= 0 && carIndex < this.carGroups[groupIndex].cars.length - 1) {
        const temp = this.carGroups[groupIndex].cars[carIndex];
        this.carGroups[groupIndex].cars[carIndex] = this.carGroups[groupIndex].cars[carIndex + 1];
        this.carGroups[groupIndex].cars[carIndex + 1] = temp;
        this.saveToStorage();
        this.renderEditor();
        return true;
      }
    }
    return false;
  }

  // Thêm nhóm mới
  addGroup(groupName) {
    groupName = groupName.trim();
    if (groupName && !this.carGroups.find(g => g.name === groupName)) {
      this.carGroups.push({
        name: groupName,
        cars: [],
        color: ''
      });
      this.saveToStorage();
      this.renderEditor();
      return true;
    }
    return false;
  }

  // Xóa nhóm
  removeGroup(groupIndex) {
    if (groupIndex >= 0 && groupIndex < this.carGroups.length) {
      this.carGroups.splice(groupIndex, 1);
      this.saveToStorage();
      this.renderEditor();
      return true;
    }
    return false;
  }

  // Sửa tên nhóm
  editGroupName(groupIndex, newName) {
    if (groupIndex >= 0 && groupIndex < this.carGroups.length) {
      newName = newName.trim();
      if (newName) {
        this.carGroups[groupIndex].name = newName;
        this.saveToStorage();
        this.renderEditor();
        return true;
      }
    }
    return false;
  }

  // Di chuyển nhóm lên
  moveGroupUp(groupIndex) {
    if (groupIndex > 0 && groupIndex < this.carGroups.length) {
      const temp = this.carGroups[groupIndex];
      this.carGroups[groupIndex] = this.carGroups[groupIndex - 1];
      this.carGroups[groupIndex - 1] = temp;
      this.saveToStorage();
      this.renderEditor();
      return true;
    }
    return false;
  }

  // Di chuyển nhóm xuống
  moveGroupDown(groupIndex) {
    if (groupIndex >= 0 && groupIndex < this.carGroups.length - 1) {
      const temp = this.carGroups[groupIndex];
      this.carGroups[groupIndex] = this.carGroups[groupIndex + 1];
      this.carGroups[groupIndex + 1] = temp;
      this.saveToStorage();
      this.renderEditor();
      return true;
    }
    return false;
  }

  // Render giao diện editor
  renderEditor() {
    const container = document.getElementById('carMenuEditorContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="mb-3 d-flex justify-content-between align-items-center">
        <div>
          <h6 class="mb-1">Quản lý Menu Xe</h6>
          <p class="text-muted small mb-0">Kéo thả các nút để sắp xếp, kéo vào thùng rác để xóa. Nhấn vào tiêu đề nhóm để đổi tên. Thêm xe bằng ô nhập bên dưới mỗi nhóm.</p>
        </div>
      </div>
      <div id="carGroupsContainer">
        ${this.carGroups.map((group, groupIndex) => this.renderGroup(group, groupIndex)).join('')}
      </div>
      ${this.carGroups.length === 0 ? '<p class="text-muted text-center">Chưa có nhóm xe nào. Hãy thêm nhóm đầu tiên!</p>' : ''}
    `;
  }

  // Render một nhóm xe (dạng lưới nút như menu chính)
  renderGroup(group, groupIndex) {
    const bg = group.color || '';
    const color = bg ? this.getContrastingTextColor(bg) : '';
    const style = bg ? `style=\"background-color:${bg};color:${color};border-color:${bg}\"` : '';
    return `
      <div class="card mb-3" data-group-index="${groupIndex}">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-sm btn-outline-secondary" onclick="carMenuEditor.moveGroupUp(${groupIndex})" ${groupIndex === 0 ? 'disabled' : ''} title="Di chuyển nhóm lên">↑</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="carMenuEditor.moveGroupDown(${groupIndex})" ${groupIndex === this.carGroups.length - 1 ? 'disabled' : ''} title="Di chuyển nhóm xuống">↓</button>
            <input type="text" class="form-control form-control-sm" style="width: 180px;" value="${group.name}" onchange="carMenuEditor.editGroupNameFromUI(${groupIndex}, this.value)" placeholder="Tên nhóm">
            <span class="badge bg-secondary">${group.cars.length} xe</span>
            <div class="d-flex align-items-center gap-1">
              <input type="color" value="${bg || '#cccccc'}" onchange="carMenuEditor.setGroupColorFromUI(${groupIndex}, this.value)" title="Màu nhóm">
              <span class="small text-muted">Màu nhóm</span>
            </div>
          </div>
          <button class="btn btn-sm btn-danger" onclick="carMenuEditor.removeGroup(${groupIndex})" title="Xóa nhóm">Xóa nhóm</button>
        </div>
        <div class="card-body">
          <div class="mb-2 d-flex flex-wrap align-items-center" data-drop-zone data-group-index="${groupIndex}" ondragover="carMenuEditor.onGroupDragOver(event)" ondrop="carMenuEditor.onGroupDrop(event)" ondragleave="carMenuEditor.onGroupDragLeave(event)">
            ${group.cars.map((car, carIndex) => `
              <button class="btn ${bg ? 'm-1' : 'btn-secondary m-1'}" ${style}
                      draggable="true"
                      ondragstart="carMenuEditor.onDragStart(event, ${groupIndex}, ${carIndex})"
                      ondragend="carMenuEditor.onDragEnd(event)"
                      data-group-index="${groupIndex}" data-car-index="${carIndex}">
                ${car}
              </button>
            `).join('')}
          </div>
          <div class="d-flex gap-2">
            <input type="text" class="form-control form-control-sm" id="newCarCode_${groupIndex}" placeholder="Mã xe mới">
            <button class="btn btn-sm btn-primary" onclick="carMenuEditor.addCarFromUI(${groupIndex})">Thêm xe</button>
          </div>
        </div>
      </div>
    `;
  }

  // Render một xe
  renderCar(car, groupIndex, carIndex) {
    return `
      <div class="d-flex align-items-center gap-1 mb-1 p-1 border rounded" data-car-index="${carIndex}">
        <button class="btn btn-sm btn-outline-secondary" onclick="carMenuEditor.moveCarUp(${groupIndex}, ${carIndex})" ${carIndex === 0 ? 'disabled' : ''} title="Di chuyển lên">↑</button>
        <button class="btn btn-sm btn-outline-secondary" onclick="carMenuEditor.moveCarDown(${groupIndex}, ${carIndex})" ${carIndex === this.carGroups[groupIndex].cars.length - 1 ? 'disabled' : ''} title="Di chuyển xuống">↓</button>
        <input type="text" class="form-control form-control-sm" style="width: 80px;" value="${car}" onchange="carMenuEditor.editCarFromUI(${groupIndex}, ${carIndex}, this.value)" placeholder="Mã xe">
        <button class="btn btn-sm btn-danger" onclick="carMenuEditor.removeCar(${groupIndex}, ${carIndex})" title="Xóa xe">×</button>
      </div>
    `;
  }

  // Các hàm helper cho UI
  addGroupFromUI() {
    const input = document.getElementById('newGroupName');
    if (this.addGroup(input.value)) {
      input.value = '';
    }
  }

  addCarFromUI(groupIndex) {
    const input = document.getElementById(`newCarCode_${groupIndex}`);
    if (this.addCar(groupIndex, input.value)) {
      input.value = '';
    }
  }

  editCarFromUI(groupIndex, carIndex, newValue) {
    this.editCar(groupIndex, carIndex, newValue);
  }

  editGroupNameFromUI(groupIndex, newValue) {
    this.editGroupName(groupIndex, newValue);
  }

  // Cập nhật menu xe trong modal chính
  updateMainMenu() {
    const modalBody = document.querySelector('#carModal .modal-body');
    if (!modalBody) return;

    // Xóa tất cả nội dung cũ
    modalBody.innerHTML = '';

    // Thêm các nhóm xe mới
    const outSet = (window.getActiveOutCarCodes && window.getActiveOutCarCodes()) || new Set();
    this.carGroups.forEach(group => {
      if (group.cars.length > 0) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'mb-2';
        const bg = group.color || '';
        const color = bg ? this.getContrastingTextColor(bg) : '';
        groupDiv.innerHTML = group.cars.map(car => {
          const isOut = outSet.has(car);
          let style = (!isOut && bg) ? `style=\"background-color:${bg};color:${color};border-color:${bg}\"` : '';
          let disabled = '';
          let outClass = '';
          if (isOut) {
            disabled = 'disabled';
            outClass = ' btn-car-out';
            style = 'style="background-color:#ccc; color:#888; border-color:#bbb;"';
          }
          const baseClass = (!bg ? 'btn-secondary ' : '');
          const classes = `btn ${baseClass}m-1${outClass}`;
          return `<button class=\"${classes}\" ${style} ${disabled} onclick=\"${isOut ? '' : `selectCarCode('${car}')`}\">${car}</button>`;
        }).join('');
        modalBody.appendChild(groupDiv);
      }
    });

    // Cập nhật multiple car selection nếu đang mở
    this.updateMultipleCarSelection();
  }

  // Cập nhật multiple car selection
  updateMultipleCarSelection() {
    if (window.multipleCarSelection) {
      window.multipleCarSelection.loadCarGroups();
      // Nếu modal đang mở thì render lại
      const modal = document.getElementById('selectMultipleModal');
      if (modal && modal.classList.contains('show')) {
        window.multipleCarSelection.renderSelectionInterface();
      }
    }
  }

  // Reset về cấu hình mặc định
  resetToDefault() {
    this.carGroups = [
      {
        name: 'Nhóm A',
        cars: ['A1', 'A12', 'A13', 'A14', 'A15', 'A16', 'A17', 'A18', 'A19', 'A20', 'AB'],
        color: ''
      },
      {
        name: 'Nhóm C', 
        cars: ['C1', 'C2', 'C3', 'C4', 'CC', 'CX'],
        color: ''
      },
      {
        name: 'Nhóm M',
        cars: ['M1', 'M2', 'M3', 'D3'],
        color: ''
      },
      {
        name: 'Nhóm X',
        cars: ['XĐ', 'XT', 'XV'],
        color: ''
      },
      {
        name: 'Nhóm S',
        cars: ['S1', 'S2', 'S3', 'S4'],
        color: ''
      },
      {
        name: 'Nhóm số',
        cars: ['03', '06', '09', '10', '25'],
        color: ''
      },
      {
        name: 'Nhóm đặc biệt',
        cars: ['ĐM', 'ĐC', 'VH'],
        color: ''
      }
    ];
    this.saveToStorage(); // Sẽ lưu vào cả localStorage và Firebase
    this.renderEditor();
  }

  setupEventListeners() {
    // Không cần setup event listeners ở đây vì chúng được gọi trực tiếp từ HTML
  }

  // Thiết lập listener để đồng bộ thay đổi từ Firebase
  setupFirebaseListener() {
    if (window.db) {
      window.db.ref('carMenuConfig').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && JSON.stringify(data) !== JSON.stringify(this.carGroups)) {
          this.carGroups = data.map(g => ({
            name: g.name,
            cars: Array.isArray(g.cars) ? g.cars : [],
            color: typeof g.color === 'string' ? g.color : ''
          }));
          this.renderEditor(); // Render lại nếu đang mở editor
          // Cập nhật menu xe chính nếu đang mở
          this.updateMainMenu();
        }
      });
    }
  }

  // UI helpers
  setGroupColorFromUI(groupIndex, colorValue) {
    if (groupIndex >= 0 && groupIndex < this.carGroups.length) {
      this.carGroups[groupIndex].color = colorValue || '';
      this.saveToStorage();
      // Không cần re-render toàn bộ, nhưng để đồng bộ preview thì render lại
      this.renderEditor();
    }
  }

  // Tính màu chữ tương phản (đen hoặc trắng) dựa vào nền
  getContrastingTextColor(hexColor) {
    try {
      const hex = hexColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      // Công thức luminance đơn giản
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      return luminance > 186 ? '#000000' : '#ffffff';
    } catch (e) {
      return '#ffffff';
    }
  }

  // DnD helpers for live preview
  getZoneItems(zone) {
    return Array.from(zone.querySelectorAll('button[draggable="true"], .drop-placeholder'));
  }
  ensurePlaceholder(zone) {
    let ph = zone.querySelector('.drop-placeholder');
    if (!ph) {
      ph = document.createElement('span');
      ph.className = 'drop-placeholder m-1';
      ph.textContent = '';
    }
    return ph;
  }
  placePlaceholder(zone, index) {
    const ph = this.ensurePlaceholder(zone);
    const items = this.getZoneItems(zone);
    // If placeholder already in DOM at correct position, skip
    if (!ph.parentElement || items[index] !== ph) {
      if (!ph.parentElement) {
        // no-op, will insert below
      } else {
        ph.parentElement.removeChild(ph);
      }
      const children = Array.from(zone.children);
      // Find the element before which to insert among existing elements (buttons or placeholder)
      let count = 0;
      for (let i = 0; i < children.length; i++) {
        const el = children[i];
        if (el.matches && (el.matches('button[draggable="true"]') || el.classList.contains('drop-placeholder'))) {
          if (count === index) {
            zone.insertBefore(ph, el);
            return;
          }
          count++;
        }
      }
      zone.appendChild(ph);
    }
  }
  removePlaceholder(zone) {
    const ph = zone.querySelector('.drop-placeholder');
    if (ph) ph.remove();
  }

  onDragStart(ev, groupIndex, carIndex) {
    try {
      ev.dataTransfer.setData('text/plain', JSON.stringify({ groupIndex, carIndex }));
      ev.dataTransfer.effectAllowed = 'move';
      ev.target.classList.add('dragging');
      const bin = document.getElementById('trashBin');
      if (bin) bin.classList.add('active');
    } catch (_) {}
  }
  onDragEnd(ev) {
    ev.target.classList.remove('dragging');
    const bin = document.getElementById('trashBin');
    if (bin) bin.classList.remove('active');
    // Clean all placeholders
    document.querySelectorAll('[data-drop-zone]').forEach(z => this.removePlaceholder(z));
  }
  onGroupDragOver(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    const zone = ev.currentTarget;
    const insertIndex = this.getDropIndex(zone, ev);
    this.placePlaceholder(zone, insertIndex);
  }
  // Tính vị trí chèn dựa theo tọa độ con trỏ so với các nút hiện có
  getDropIndex(zone, ev) {
    const items = Array.from(zone.querySelectorAll('button[draggable="true"]'));
    if (items.length === 0) return 0;
    const x = ev.clientX;
    const y = ev.clientY;
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const midX = rect.left + rect.width / 2;
      if (y < midY) return i;
      if (y >= rect.top && y <= rect.bottom && x < midX) return i;
    }
    return items.length; // Mặc định chèn cuối
  }
  onGroupDrop(ev) {
    ev.preventDefault();
    const zone = ev.currentTarget;
    const toGroup = Number(zone.getAttribute('data-group-index'));
    let payload;
    try { payload = JSON.parse(ev.dataTransfer.getData('text/plain')); } catch (_) { return; }
    const { groupIndex: fromGroup, carIndex } = payload || {};
    if (Number.isNaN(fromGroup) || Number.isNaN(carIndex)) return;

    const car = this.carGroups[fromGroup]?.cars?.[carIndex];
    if (!car) return;

    // Tính vị trí chèn theo con trỏ
    let insertIndex = this.getDropIndex(zone, ev);

    // Xóa khỏi nguồn
    this.carGroups[fromGroup].cars.splice(carIndex, 1);

    // Nếu kéo trong cùng group và vị trí xóa đứng trước vị trí chèn, cần điều chỉnh index đích
    if (fromGroup === toGroup && carIndex < insertIndex) {
      insertIndex = Math.max(0, insertIndex - 1);
    }

    // Chen vào đích
    insertIndex = Math.max(0, Math.min(insertIndex, this.carGroups[toGroup].cars.length));
    this.carGroups[toGroup].cars.splice(insertIndex, 0, car);

    // Cleanup placeholder
    this.removePlaceholder(zone);

    this.saveToStorage();
    this.renderEditor();
  }
  onGroupDragLeave(ev) {
    const zone = ev.currentTarget;
    // Nếu con trỏ rời hoàn toàn khỏi zone, bỏ placeholder
    const rect = zone.getBoundingClientRect();
    const { clientX: x, clientY: y } = ev;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      this.removePlaceholder(zone);
    }
  }
  onTrashDragOver(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
  }
  onTrashDrop(ev) {
    ev.preventDefault();
    let payload;
    try { payload = JSON.parse(ev.dataTransfer.getData('text/plain')); } catch (_) { return; }
    const { groupIndex, carIndex } = payload || {};
    if (Number.isNaN(groupIndex) || Number.isNaN(carIndex)) return;

    if (this.carGroups[groupIndex] && this.carGroups[groupIndex].cars[carIndex] !== undefined) {
      this.carGroups[groupIndex].cars.splice(carIndex, 1);
      this.saveToStorage();
      this.renderEditor();
    }
  }
}

// Khởi tạo editor khi trang load
let carMenuEditor;
document.addEventListener('DOMContentLoaded', function() {
  carMenuEditor = new CarMenuEditor();
  window.carMenuEditor = carMenuEditor; // Để có thể truy cập từ script.js
}); 