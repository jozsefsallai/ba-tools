package inventorymanagement

// CellProbability contains the probability of a cell in the grid containing
// any item + each item type in particular.
type CellProbability struct {
	// Total is the probability of the cell containing any item.
	Total float64

	// ItemTypes is the probability of the cell containing each item type.
	ItemTypes []float64
}
