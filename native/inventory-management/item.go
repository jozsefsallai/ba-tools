package inventorymanagement

import "sort"

// Item represents an item that can be placed in the grid.
type Item struct {
	// Width is the width of the item.
	Width int

	// Height is the height of the item.
	Height int

	// Count is the number of items that need to be placed.
	Count int
}

// Area returns the area (wxh) of the itme.
func (i *Item) Area() int {
	return i.Width * i.Height
}

// OrderedItemIndex is a helper struct that's used for sorting items and keeping
// track of their idx.
type OrderedItemIndex struct {
	Index int
	Area  int
}

// MakeOrderedItem turns an item into an ordered item index.
func MakeOrderedItem(item Item, index int) OrderedItemIndex {
	return OrderedItemIndex{
		Index: index,
		Area:  item.Area(),
	}
}

// SortOrderedItemsByArea calls std sort with a comparison function that sorts
// items by area in descending order.
func SortOrderedItemsByArea(ordered []OrderedItemIndex) {
	sort.Slice(ordered, func(i, j int) bool {
		return ordered[i].Area > ordered[j].Area
	})
}
