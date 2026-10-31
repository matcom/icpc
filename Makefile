.PHONY: data serve test

data:
	python3 scripts/build_data.py

serve: data
	python3 -m http.server 8000 --directory site --bind 127.0.0.1

test:
	uv run --with pytest pytest -q
