import sys
import os

def main():
    if len(sys.argv) < 3:
        print("Usage: python remove_bg.py <input_path> <output_path>")
        sys.exit(1)
        
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    
    # Try importing dependencies, attempt auto-install if missing
    try:
        from rembg import remove
        from PIL import Image
    except ImportError:
        print("[Python remove_bg] Packages missing. Attempting auto-installation...")
        os.system('pip install "rembg[cpu]<=2.0.60" pillow "opencv-python-headless<4.9"')
        try:
            from rembg import remove
            from PIL import Image
        except Exception as e:
            print(f"[Python remove_bg] Auto-installation failed: {str(e)}")
            sys.exit(1)

    try:
        input_image = Image.open(input_path)
        output_image = remove(input_image)
        output_image.save(output_path)
        print("SUCCESS")
    except Exception as e:
        print(f"[Python remove_bg] Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
