// Babylon.js 3D сцена для рендеринга моделей из Rhino

let engine;
let scene;
let camera;
let light;
let loadedModel;
let isAutoRotating = false;

// Инициализация приложения
function initializeApp() {
    const canvas = document.getElementById('renderCanvas');
    engine = new BABYLON.Engine(canvas, true);
    
    // Создаем сцену
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Тёмный фон
    
    // Настройка камеры
    camera = new BABYLON.ArcRotateCamera('camera', Math.PI / 2, Math.PI / 2.5, 100, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50;
    camera.minZ = 0.1;
    
    // Добавляем освещение
    light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(1, 1, 1), scene);
    light.intensity = 1.0;
    
    // Дополнительный точечный свет
    const pointLight = new BABYLON.PointLight('pointLight', new BABYLON.Vector3(10, 10, 10), scene);
    pointLight.intensity = 0.7;
    
    // Настройка событий
    setupEventListeners();
    
    // Запуск рендеринга
    engine.runRenderLoop(function() {
        if (isAutoRotating && loadedModel) {
            loadedModel.rotation.y += 0.005;
        }
        scene.render();
    });
    
    // Обработка изменения размера окна
    window.addEventListener('resize', function() {
        engine.resize();
    });
}

// Настройка слушателей событий
function setupEventListeners() {
    // Загрузка файла
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    
    // Управление освещением
    document.getElementById('lightIntensity').addEventListener('input', function(e) {
        light.intensity = parseFloat(e.target.value);
        document.getElementById('lightValue').textContent = e.target.value;
    });
    
    // Сброс позиции камеры
    document.getElementById('resetCamera').addEventListener('click', resetCamera);
    
    // Авто-вращение
    document.getElementById('autoRotate').addEventListener('click', toggleAutoRotate);
}

// Загрузка файла
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    const statusDiv = document.getElementById('loadingStatus');
    const infoDiv = document.getElementById('modelInfo');
    
    statusDiv.textContent = '⏳ Загрузка...';
    
    reader.onload = function(event) {
        try {
            const arrayBuffer = event.target.result;
            const blob = new Blob([arrayBuffer]);
            const url = URL.createObjectURL(blob);
            
            // Удаляем старую модель если есть
            if (loadedModel) {
                loadedModel.dispose();
            }
            
            // Определяем тип файла
            const fileName = file.name.toLowerCase();
            
            if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
                loadGLTFModel(url, statusDiv, infoDiv, file.name);
            } else if (fileName.endsWith('.obj')) {
                loadOBJModel(url, statusDiv, infoDiv, file.name);
            } else if (fileName.endsWith('.stl')) {
                loadSTLModel(url, statusDiv, infoDiv, file.name);
            } else {
                statusDiv.textContent = '❌ Неподдерживаемый формат';
            }
        } catch (error) {
            statusDiv.textContent = '❌ Ошибка загрузки: ' + error.message;
            console.error('Ошибка:', error);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// Загрузка glTF/GLB моделей
function loadGLTFModel(url, statusDiv, infoDiv, fileName) {
    BABYLON.SceneLoader.ImportMesh('', '', url, scene, function(meshes) {
        if (meshes.length > 0) {
            loadedModel = meshes[0];
            fitCameraToModel(loadedModel);
            statusDiv.textContent = '✅ Модель загружена';
            infoDiv.innerHTML = `
                <strong>${fileName}</strong><br>
                Формат: glTF/GLB<br>
                Объектов: ${meshes.length}
            `;
        }
    }, null, function(error) {
        statusDiv.textContent = '❌ Ошибка: ' + error.message;
    });
}

// Загрузка OBJ моделей
function loadOBJModel(url, statusDiv, infoDiv, fileName) {
    BABYLON.SceneLoader.ImportMesh('', '', url, scene, function(meshes) {
        if (meshes.length > 0) {
            loadedModel = BABYLON.MeshBuilder.CreateBox('model', {}, scene);
            meshes.forEach(mesh => {
                mesh.parent = loadedModel;
            });
            fitCameraToModel(loadedModel);
            statusDiv.textContent = '✅ Модель загружена';
            infoDiv.innerHTML = `
                <strong>${fileName}</strong><br>
                Формат: OBJ<br>
                Объектов: ${meshes.length}
            `;
        }
    }, null, function(error) {
        statusDiv.textContent = '❌ Ошибка: ' + error.message;
    });
}

// Загрузка STL моделей (базовая поддержка)
function loadSTLModel(url, statusDiv, infoDiv, fileName) {
    // STL требует специального loader'а
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
        try {
            const geometry = parseSTL(xhr.response);
            const mesh = new BABYLON.Mesh('stl-model', scene);
            const vertexData = geometry;
            vertexData.applyToMesh(mesh);
            
            loadedModel = mesh;
            fitCameraToModel(mesh);
            statusDiv.textContent = '✅ STL модель загружена';
            infoDiv.innerHTML = `
                <strong>${fileName}</strong><br>
                Формат: STL<br>
                Вершин: ${mesh.getTotalVertices()}
            `;
        } catch (error) {
            statusDiv.textContent = '❌ Ошибка парсинга STL: ' + error.message;
        }
    };
    xhr.send();
}

// Парсинг STL формата
function parseSTL(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const triangles = view.getUint32(80, true);
    
    const positions = [];
    const normals = [];
    const indices = [];
    
    let offset = 84;
    
    for (let i = 0; i < triangles; i++) {
        const nx = view.getFloat32(offset, true); offset += 4;
        const ny = view.getFloat32(offset, true); offset += 4;
        const nz = view.getFloat32(offset, true); offset += 4;
        
        const normal = new BABYLON.Vector3(nx, ny, nz);
        
        for (let j = 0; j < 3; j++) {
            const x = view.getFloat32(offset, true); offset += 4;
            const y = view.getFloat32(offset, true); offset += 4;
            const z = view.getFloat32(offset, true); offset += 4;
            
            positions.push(x, y, z);
            normals.push(nx, ny, nz);
        }
        
        offset += 2; // attribute byte count
        
        indices.push(i * 3, i * 3 + 1, i * 3 + 2);
    }
    
    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.normals = normals;
    vertexData.indices = indices;
    
    return vertexData;
}

// Подгонка камеры к размеру модели
function fitCameraToModel(model) {
    const boundingBox = model.getBoundingInfo().boundingBox;
    const size = boundingBox.maximum.subtract(boundingBox.minimum);
    const maxSize = Math.max(size.x, size.y, size.z);
    
    camera.radius = maxSize * 2;
    camera.target = boundingBox.center;
}

// Сброс позиции камеры
function resetCamera() {
    if (loadedModel) {
        fitCameraToModel(loadedModel);
    } else {
        camera.radius = 100;
        camera.target = BABYLON.Vector3.Zero();
    }
}

// Переключение авто-вращения
function toggleAutoRotate() {
    isAutoRotating = !isAutoRotating;
    const btn = document.getElementById('autoRotate');
    btn.textContent = isAutoRotating ? '⏸️ Остановить' : '🔄 Авто-вращение';
}

// Запуск приложения когда страница загружена
window.addEventListener('DOMContentLoaded', initializeApp);