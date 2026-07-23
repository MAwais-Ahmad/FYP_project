from PIL import Image, ImageDraw, ImageFont
import os

def render_paper_image(output_image_path):
    # Create white canvas (A4 ratio approx 1650 x 2338 for sharp text)
    width, height = 1650, 2338
    img = Image.new('RGB', (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Try using standard fonts or default
    try:
        font_title = ImageFont.truetype("arial.ttf", 44)
        font_header = ImageFont.truetype("arial.ttf", 34)
        font_body = ImageFont.truetype("arial.ttf", 26)
        font_bold = ImageFont.truetype("arialbd.ttf", 26)
    except IOError:
        font_title = ImageFont.load_default()
        font_header = font_title
        font_body = font_title
        font_bold = font_title

    text_lines = [
        ("EXAM PAPER: CS101 - Introduction to Programming", font_title, (0, 51, 102)),
        ("Total Duration: 45 Minutes | Total Marks: 20 Marks", font_header, (51, 51, 51)),
        ("--------------------------------------------------------------------------------", font_body, (150, 150, 150)),
        ("", font_body, (0,0,0)),
        ("Q1. [Marks: 2 | Time: 90s] What is the output of print(2 ** 3) in Python?", font_bold, (0, 0, 128)),
        ("A) 5", font_body, (0, 0, 0)),
        ("B) 6", font_body, (0, 0, 0)),
        ("C) 8", font_body, (0, 0, 0)),
        ("D) 9", font_body, (0, 0, 0)),
        ("Correct Answer: C", font_bold, (0, 128, 0)),
        ("", font_body, (0,0,0)),
        ("Q2. [Marks: 2 | Time: 90s] Which data structure follows First-In First-Out (FIFO)?", font_bold, (0, 0, 128)),
        ("A) Stack", font_body, (0, 0, 0)),
        ("B) Queue", font_body, (0, 0, 0)),
        ("C) Tree", font_body, (0, 0, 0)),
        ("D) Graph", font_body, (0, 0, 0)),
        ("Correct Answer: B", font_bold, (0, 128, 0)),
        ("", font_body, (0,0,0)),
        ("Q3. [Marks: 6 | Time: 300s]", font_bold, (0, 0, 128)),
        ("Question: Explain the difference between a list and a tuple in Python.", font_body, (0, 0, 0)),
        ("Key Points:", font_bold, (0, 128, 0)),
        ("- Lists are mutable whereas tuples are immutable.", font_body, (0, 0, 0)),
        ("- Lists use square brackets [] whereas tuples use parentheses ().", font_body, (0, 0, 0)),
        ("- Tuples are faster and consume less memory than lists.", font_body, (0, 0, 0)),
        ("", font_body, (0,0,0)),
        ("Q4. [Marks: 10 | Time: 600s]", font_bold, (0, 0, 128)),
        ("Question: Write a Python program logic to check if a string is a palindrome.", font_body, (0, 0, 0)),
        ("Key Points:", font_bold, (0, 128, 0)),
        ("- Convert string to lowercase and remove spaces/special characters.", font_body, (0, 0, 0)),
        ("- Compare the string with its reverse (s == s[::-1]).", font_body, (0, 0, 0)),
        ("- Return True if identical, otherwise return False.", font_body, (0, 0, 0)),
    ]

    y = 80
    for line, font, color in text_lines:
        draw.text((80, y), line, fill=color, font=font)
        y += 48 if font == font_title else (40 if font == font_header else 34)

    img.save(output_image_path)
    print(f"Saved generated paper image to {output_image_path}")

output_path = r"d:\Projects\FYP_project\sample_test_papers\sample_paper_camera_scan.png"
render_paper_image(output_path)
