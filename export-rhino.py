"""
Скрипт для экспорта 3D моделей из Rhinoceros в формат glTF (GLB)

Этот скрипт копируется в папку с плагинами Rhino и используется для экспорта.
Поддерживает экспорт в глобальный формат glTF/GLB для высокого качества рендеринга.

Использование:
1. Скопируйте этот файл в папку с плагинами Rhino
2. В Rhino используйте: RunPythonScript (путь к этому файлу)
3. Выберите объекты для экспорта
4. Укажите путь и имя файла
"""

import rhinoscriptsyntax as rs
import os

def get_file_path():
    """Диалог выбора места сохранения файла"""
    filter = "glTF Binary (*.glb)|*.glb||Wavefront OBJ (*.obj)|*.obj||STL Format (*.stl)|*.stl||All Files (*.*)|*.*||"
    filename = rs.SaveFileName("Export 3D Model", filter)
    return filename

def select_objects():
    """Выбор объектов для экспорта"""
    rs.MessageBox(
        "Выберите объекты для экспорта.\nНажмите OK когда готовы.",
        title="Select Objects for Export"
    )
    objects = rs.GetObjects(
        "Select objects to export",
        0,  # Все типы объектов
        True,  # Разрешить множественный выбор
        False,  # Не разрешать предыдущий выбор
        False   # Не показывать имена объектов
    )
    
    if not objects:
        rs.MessageBox("Нет выбранных объектов", title="Error")
        return None
    
    return objects

def export_model(objects, file_path):
    """
    Экспорт модели
    
    Args:
        objects: Список GUID объектов для экспорта
        file_path: Путь для сохранения файла
    """
    if not objects or not file_path:
        return False
    
    try:
        # Определяем формат по расширению файла
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == '.glb':
            # Экспорт в glTF Binary (рекомендуется для лучшего качества)
            export_command = f'_Export "{file_path}" _Enter'
        elif ext == '.obj':
            # Экспорт в OBJ
            export_command = f'_Export "{file_path}" _Enter'
        elif ext == '.stl':
            # Экспорт в STL
            export_command = f'_Export "{file_path}" _Enter'
        else:
            rs.MessageBox(
                "Неподдерживаемый формат!\nИспользуйте: GLB, OBJ или STL",
                title="Error"
            )
            return False
        
        # Выделяем объекты
        for obj_id in objects:
            rs.SelectObject(obj_id)
        
        # Выполняем экспорт
        rs.Command(export_command)
        
        rs.MessageBox(
            f"✅ Модель успешно экспортирована!\n\n"
            f"Путь: {file_path}\n\n"
            f"Теперь вы можете загрузить её в 3D Viewer",
            title="Export Successful"
        )
        return True
        
    except Exception as e:
        rs.MessageBox(f"❌ Ошибка экспорта:\n{str(e)}", title="Error")
        return False

def main():
    """Главная функция"""
    # Проверяем что Rhino открыт
    if not rs.IsRhino():
        rs.MessageBox("Пожалуйста, откройте Rhinoceros", title="Error")
        return
    
    # Получаем путь для сохранения
    file_path = get_file_path()
    if not file_path:
        rs.MessageBox("Экспорт отменён", title="Info")
        return
    
    # Получаем объекты для экспорта
    objects = select_objects()
    if not objects:
        return
    
    # Выполняем экспорт
    export_model(objects, file_path)

# Запуск скрипта
if __name__ == "__main__":
    main()