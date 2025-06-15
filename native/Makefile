SOURCE="cmd/native/main.go"
BINARY="../public/wasm/main.wasm"

build:
	GOOS=js GOARCH=wasm tinygo build -o $(BINARY) $(SOURCE)

build-production:
	GOOS=js GOARCH=wasm tinygo build -o $(BINARY) --no-debug $(SOURCE)

all: build
