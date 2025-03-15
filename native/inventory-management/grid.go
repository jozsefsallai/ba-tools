package inventorymanagement

import (
	"math/rand"
)

// Grid represents a 2D grid of cells. Each cell can contain part of an item or
// nothing at all.
type Grid struct {
	// Width is the width of the grid.
	Width int

	// Height is the height of the grid.
	Height int

	// Items is a matrix representing the items in the grid. If an item is -1, it
	// means the cell is blocked and cannot contain any item. If the item is 0,
	// it means the cell is empty.
	Items [][]int
}

// GridPlacement represents a valid placement of an item in the grid.
type GridPlacement struct {
	// Pos is the position of the item in the grid.
	Pos Coords

	// Rotated is whether or not the item is rotated.
	Rotated bool
}

// NewGrid creates a new grid with a given width, height, and a list of blocked
// cells (represented by X and Y coordinates).
func NewGrid(width, height int, blockedCells []Coords) *Grid {
	grid := &Grid{
		Width:  width,
		Height: height,
		Items:  make([][]int, height),
	}

	for y := 0; y < height; y++ {
		grid.Items[y] = make([]int, width)
	}

	for _, cell := range blockedCells {
		if cell.X >= 0 && cell.X < width && cell.Y >= 0 && cell.Y < height {
			grid.Items[cell.Y][cell.X] = -1
		}
	}

	return grid
}

// CanPlace checks whether an item can be placed in the grid at a given set of
// start coordinates.
func (g *Grid) CanPlace(item Item, coords Coords, rotated bool) bool {
	w, h := item.Width, item.Height
	if rotated {
		w, h = h, w
	}

	// Shouldn't really ever happen but we'll handle out of bounds cases too.
	if coords.X < 0 || coords.Y < 0 || coords.X+w > g.Width || coords.Y+h > g.Height {
		return false
	}

	for y := coords.Y; y < coords.Y+h; y++ {
		for x := coords.X; x < coords.X+w; x++ {
			if g.Items[y][x] != 0 {
				// Cell contains an item or is blocked, we can't place the item here.
				return false
			}
		}
	}

	return true
}

// Place places an item in the grid at a given set of start coordinates. In this
// context, placing an item means setting all the cells to the index of the item
// type.
func (g *Grid) Place(item Item, coords Coords, itemTypeIndex int, rotated bool) {
	w, h := item.Width, item.Height
	if rotated {
		w, h = h, w
	}

	for y := coords.Y; y < coords.Y+h; y++ {
		for x := coords.X; x < coords.X+w; x++ {
			g.Items[y][x] = itemTypeIndex + 1
		}
	}
}

// CountItemCells creates a map which counts how many cells each item type
// occupies in the final grid.
func (g *Grid) CountItemCells() map[int]int {
	counts := make(map[int]int)

	for y := 0; y < g.Height; y++ {
		for x := 0; x < g.Width; x++ {
			if g.Items[y][x] > 0 {
				counts[g.Items[y][x]]++
			}
		}
	}

	return counts
}

// ValidateItemCounts will return true if all the items are present in the grid.
func (g *Grid) ValidateItemCounts(itemTypes []Item) bool {
	cellCounts := g.CountItemCells()

	for typeIdx, itemType := range itemTypes {
		expectedCells := itemType.Count * itemType.Width * itemType.Height
		actualCells := cellCounts[typeIdx+1]

		if expectedCells != actualCells {
			return false
		}
	}

	return true
}

// GetValidPlacements returns a list of all the possible placements of an item
// in the grid.
func (g *Grid) GetValidPlacements(rng *rand.Rand, item Item, randomize bool) []GridPlacement {
	var validPlacements []GridPlacement

	// Try to place the item on the grid in all possible positions.
	for y := 0; y <= g.Height-item.Height; y++ {
		for x := 0; x <= g.Width-item.Width; x++ {
			pos := Coords{X: x, Y: y}

			if g.CanPlace(item, pos, false) {
				validPlacements = append(validPlacements, GridPlacement{
					Pos:     pos,
					Rotated: false,
				})
			}
		}
	}

	// If the item isn't a square, also check if it will can be placed rotated.
	if item.Width != item.Height {
		for y := 0; y <= g.Height-item.Width; y++ {
			for x := 0; x <= g.Width-item.Height; x++ {
				pos := Coords{X: x, Y: y}
				if g.CanPlace(item, pos, true) {
					validPlacements = append(validPlacements, struct {
						Pos     Coords
						Rotated bool
					}{pos, true})
				}
			}
		}
	}

	// Finetune the placements by randomizing them.
	if randomize && len(validPlacements) > 1 {
		for i := len(validPlacements) - 1; i > 0; i-- {
			j := rng.Intn(i + 1)
			validPlacements[i], validPlacements[j] = validPlacements[j], validPlacements[i]
		}
	}

	return validPlacements
}
