package inventorymanagement

import (
	"errors"
	"math/rand"
	"time"
)

// CalculateProbabilities will run simulations to calculate the probability of
// each cell in a given gridspace containing a set of item types, with respect
// to a set of blocked cells on which placement is not allowed.
func CalculateProbabilities(gridWidth, gridHeight int, itemTypes []Item, blockedCells []Coords, numSimulations int) ([][]CellProbability, error) {
	// Initialize the probability matrix.
	probabilities := make([][]CellProbability, gridHeight)

	for y := 0; y < gridHeight; y++ {
		probabilities[y] = make([]CellProbability, gridWidth)

		for x := 0; x < gridWidth; x++ {
			probabilities[y][x] = CellProbability{
				Total:     0,
				ItemTypes: make([]float64, len(itemTypes)),
			}
		}
	}

	simulationsPerSeed := numSimulations / SeedVariations

	totalSuccessful := 0

	for seedVariation := 0; seedVariation < SeedVariations; seedVariation++ {
		rng := rand.New(rand.NewSource(time.Now().UnixNano() + int64(seedVariation*1000)))

		successfulSimulations := 0

		for i := 0; i < simulationsPerSeed && successfulSimulations < simulationsPerSeed; i++ {
			grid := NewGrid(gridWidth, gridHeight, blockedCells)
			allItemsPlaced := true

			// Randomize the order in which items are placed for each simulation. This
			// is done to avoid systematic placement bias.
			itemOrder := rng.Perm(len(itemTypes))

			// Attempt #1: Place items in the random order.
			for _, idx := range itemOrder {
				itemType := itemTypes[idx]

				for count := 0; count < itemType.Count; count++ {
					validPlacements := grid.GetValidPlacements(rng, itemType, true)

					if len(validPlacements) == 0 {
						allItemsPlaced = false
						break
					}

					firstPlacement := validPlacements[0]
					grid.Place(itemType, firstPlacement.Pos, idx, firstPlacement.Rotated)
				}

				if !allItemsPlaced {
					break
				}
			}

			// We couldn't place all items in the randomized attempt, so we'll try
			// something else.
			if !allItemsPlaced {
				grid = NewGrid(gridWidth, gridHeight, blockedCells)
				allItemsPlaced = true

				ordered := make([]OrderedItemIndex, len(itemTypes))
				for i, item := range itemTypes {
					ordered[i] = MakeOrderedItem(item, i)
				}

				// Attempt #2: Place the items based on their size (largest first).
				// This is a lot more deterministic but it can significantly reduce the
				// number of failed simulations.
				SortOrderedItemsByArea(ordered)

				// TODO: refactor this to avoid code duplication.
				for _, orderedItem := range ordered {
					idx := orderedItem.Index
					itemType := itemTypes[idx]

					for count := 0; count < itemType.Count; count++ {
						validPlacements := grid.GetValidPlacements(rng, itemType, true)

						if len(validPlacements) == 0 {
							allItemsPlaced = false
							break
						}

						firstPlacement := validPlacements[0]
						grid.Place(itemType, firstPlacement.Pos, idx, firstPlacement.Rotated)
					}

					if !allItemsPlaced {
						break
					}
				}
			}

			if allItemsPlaced && grid.ValidateItemCounts(itemTypes) {
				successfulSimulations++

				for y := 0; y < gridHeight; y++ {
					for x := 0; x < gridWidth; x++ {
						if grid.Items[y][x] > 0 {
							itemTypeIdx := grid.Items[y][x] - 1
							probabilities[y][x].ItemTypes[itemTypeIdx]++
							probabilities[y][x].Total++
						}
					}
				}
			}
		}

		totalSuccessful += successfulSimulations
	}

	if totalSuccessful > 0 {
		normalizationFactor := 1.0 / float64(totalSuccessful)

		for y := 0; y < gridHeight; y++ {
			for x := 0; x < gridWidth; x++ {
				probabilities[y][x].Total *= normalizationFactor

				for i := range probabilities[y][x].ItemTypes {
					probabilities[y][x].ItemTypes[i] *= normalizationFactor
				}
			}
		}
	} else {
		return nil, errors.New("No successful simulations. Grid data is most likely invalid!")
	}

	return probabilities, nil
}
