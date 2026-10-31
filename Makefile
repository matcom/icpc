.PHONY: data ratings serve test

data:
	uv run python scripts/build_data.py

ratings:
	uv run python scripts/refresh_ratings.py

serve: data
	python3 -m http.server 8000 --directory site --bind 127.0.0.1

test:
	uv run --with pytest pytest -q
	node --test tests/fuzzy.test.mjs
