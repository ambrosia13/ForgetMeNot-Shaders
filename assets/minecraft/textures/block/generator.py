from PIL import Image
 
 
def main():
    while True:
        name = input("Name of the texture: ")
        block_type = 2#int(input("Block type (0 - solid, 1 - translucent, 2 - emissive): "))
        encoded = 1 << 7 | block_type << 5
        if block_type == 0:
            # Nothing
            pass
        elif block_type == 1:
            color_id = int(input("Color id (0 - 31): "))
            encoded |= color_id
        elif block_type == 2:
            color_id = int(input("Color id (0 - 31): "))
            encoded |= color_id
        
        img = Image.new("RGBA", (16, 16), (255, 0, 255, encoded))
        img.save("marker_" + name + ".png")

    

if __name__ == "__main__":
    main()