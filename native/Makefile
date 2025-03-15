SOURCE="cmd/native/main.go"
BINARY="../public/wasm/main.wasm"

build:
	GOOS=js GOARCH=wasm go build -o $(BINARY) $(SOURCE)

build-production:
	GOOS=js GOARCH=wasm go build -o $(BINARY) -ldflags "-s -w" $(SOURCE)

all: build
