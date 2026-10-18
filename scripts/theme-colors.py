# Computes the colors of each background for src/themes.ts from the thumbnails in public/static/img/thumb:
# - color: the photo's average color (shown while it loads, and as the browser bar color)
# - card: a light tint of the photo's main hue for the content card, so dark text stays readable
# Usage: python3 scripts/theme-colors.py [id ...]   (after `npm run images`; requires Pillow)
import glob, math, os, sys
from PIL import Image

THUMBS = os.path.join(os.path.dirname(__file__), '..', 'public', 'static', 'img', 'thumb')


def srgb_to_oklab(r, g, b):
	def linear(c):
		c /= 255
		return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

	r, g, b = linear(r), linear(g), linear(b)
	l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
	m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
	s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
	a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
	bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
	return a, bb


def oklch_to_hex(lightness, chroma, hue):
	a, b = chroma * math.cos(math.radians(hue)), chroma * math.sin(math.radians(hue))
	l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
	m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
	s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3
	rgb = (
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
	)

	def gamma(x):
		x = min(max(x, 0), 1)
		return 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055

	return '#' + ''.join(f'{round(gamma(c) * 255):02x}' for c in rgb)


def colors(path):
	image = Image.open(path).convert('RGB')
	average = '#%02x%02x%02x' % image.resize((1, 1), Image.BOX).getpixel((0, 0))

	# main hue: colorful pixels dominate, gray ones hardly count
	small = image.resize((96, 64))
	x = y = 0.0
	# get_flattened_data replaces getdata in Pillow 12
	for pixel in small.get_flattened_data() if hasattr(small, 'get_flattened_data') else small.getdata():
		a, b = srgb_to_oklab(*pixel)
		chroma = math.hypot(a, b)
		x += chroma * a  # = chroma² · cos(hue)
		y += chroma * b
	strength = math.hypot(x, y) / (96 * 64)  # how colorful (and consistent in hue) the photo is
	hue = math.degrees(math.atan2(y, x)) % 360
	# nearly colorless photos get an almost neutral card
	card = oklch_to_hex(0.925, 0.012 if strength < 0.0015 else 0.035, hue)
	return average, card


ids = sys.argv[1:] or sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(THUMBS, '*.webp')))
for id in ids:
	average, card = colors(os.path.join(THUMBS, f'{id}.webp'))
	print(f"{id}: color: '{average}', card: '{card}'")
