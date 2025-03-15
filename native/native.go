//go:build js && wasm
// +build js,wasm

package native

import (
	"syscall/js"

	im "github.com/jozsefsallai/ba-tools/native/inventory-management"
)

func InventoryManagement(payload js.Value) (js.Value, error) {
	rawItems := payload.Get("items")
	rawBlockedCells := payload.Get("blockedCells")

	items := make([]im.Item, rawItems.Length())
	for i := 0; i < rawItems.Length(); i++ {
		item := rawItems.Index(i)
		items[i] = im.Item{
			Width:  item.Get("width").Int(),
			Height: item.Get("height").Int(),
			Count:  item.Get("count").Int(),
		}
	}

	blockedCells := make([]im.Coords, rawBlockedCells.Length())
	for i := 0; i < rawBlockedCells.Length(); i++ {
		cell := rawBlockedCells.Index(i)
		blockedCells[i] = im.Coords{
			X: cell.Get("x").Int(),
			Y: cell.Get("y").Int(),
		}
	}

	result, err := im.CalculateProbabilities(im.GridWidth, im.GridHeight, items, blockedCells, im.Simulations)

	if err != nil {
		return js.Undefined(), err
	}

	output := js.Global().Get("Array").New(len(result))

	for i, row := range result {
		jsRow := js.Global().Get("Array").New(len(row))

		for j, cell := range row {
			jsCell := js.Global().Call("Object")
			jsCell.Set("total", cell.Total)

			itemTypesArray := js.Global().Get("Array").New(len(cell.ItemTypes))
			for k, item := range cell.ItemTypes {
				itemTypesArray.SetIndex(k, js.ValueOf(item))
			}
			jsCell.Set("itemTypes", itemTypesArray)

			jsRow.SetIndex(j, jsCell)
		}

		output.SetIndex(i, jsRow)
	}

	return output, nil
}

func InitNativeModules() {
	nativeModules := js.Global().Get("NativeModules")
	if nativeModules.Type() == js.TypeUndefined {
		nativeModules = js.ValueOf(map[string]interface{}{})
		js.Global().Set("NativeModules", nativeModules)
	}

	nativeModules.Set("simulateInventoryManagement", js.FuncOf(func(this js.Value, p []js.Value) interface{} {
		if len(p) == 0 {
			return map[string]interface{}{
				"error": "missing payload",
			}
		}

		payload := p[0]
		result, err := InventoryManagement(payload)

		if err != nil {
			return map[string]interface{}{
				"result": nil,
				"error":  err.Error(),
			}
		}

		return map[string]interface{}{
			"result": result,
			"error":  nil,
		}
	}))
}
