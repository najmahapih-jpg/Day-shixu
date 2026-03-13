import os
from PIL import Image

# === 路径配置 (已根据你的实际环境更新) ===
# 原始图位置
INPUT_DIR = r"C:\Users\ASUS\Desktop\小程序项目\星划pro\tabbar" 

# 项目标准存放位置
OUTPUT_DIR = r"C:\Users\ASUS\Desktop\小程序项目\星划pro\src\static\icons\tabbar"

# 目标尺寸规范
TARGET_SIZE = 81
CONTENT_MAX_SIZE = 72 
# =================

def process_images():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"✅ 已创建项目目录: {OUTPUT_DIR}")

    count = 0
    print(f"🚀 开始处理原始素材...")

    for filename in os.listdir(INPUT_DIR):
        if filename.lower().endswith(".png"):
            # 自动映射命名
            # 如果你的文件名已经是 home.png 等，这里直接保留；
            # 如果是之前挑出的名字，脚本会原样处理，建议运行后手动检查文件名。
            input_path = os.path.join(INPUT_DIR, filename)
            output_path = os.path.join(OUTPUT_DIR, filename)

            try:
                with Image.open(input_path) as img:
                    img = img.convert("RGBA")
                    
                    # 比例缩放
                    scale = min(CONTENT_MAX_SIZE / img.width, CONTENT_MAX_SIZE / img.height)
                    new_w, new_h = int(img.width * scale), int(img.height * scale)
                    
                    resized_img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                    
                    # 居中合成到 81x81 画布
                    canvas = Image.new("RGBA", (TARGET_SIZE, TARGET_SIZE), (0, 0, 0, 0))
                    canvas.paste(resized_img, ((TARGET_SIZE - new_w) // 2, (TARGET_SIZE - new_h) // 2))
                    
                    canvas.save(output_path, "PNG")
                    print(f"  [完成] {filename} -> 81x81px (已存入项目目录)")
                    count += 1
            except Exception as e:
                print(f"  [失败] {filename}: {e}")

    print(f"\n🎉 搞定！共处理 {count} 个图标。")
    print(f"💡 提示：请确保文件名为 home.png, home-active.png 等规范格式。")

if __name__ == "__main__":
    process_images()