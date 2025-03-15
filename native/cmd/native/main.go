//go:build js && wasm
// +build js,wasm

package main

import "github.com/jozsefsallai/ba-tools/native"

func main() {
	c := make(chan struct{}, 0)

	println("Initializing native modules...")
	native.InitNativeModules()

	<-c
}
