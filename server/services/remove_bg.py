import sys

def main():
    if len(sys.argv) < 3:
        print("Usage: python remove_bg.py <input_path> <output_path>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    # Import dependencies — fail cleanly if missing
    try:
        from rembg import remove
        from PIL import Image
    except ImportError as e:
        print(f"[Python remove_bg] Missing dependency: {e}")
        print("[Python remove_bg] Install with: pip install -r requirements.txt")
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
