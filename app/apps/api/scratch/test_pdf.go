package main

import (
	"fmt"
	"os"
	"github.com/pdfcpu/pdfcpu/pkg/api"
)

func main() {
	// Create a dummy PDF if possible? No, too hard.
	// Just test if we can create a watermark object.
	wm, err := api.ImageWatermark("test.png", "position:br, scale:0.15, offset:20 20", true, false, 0)
	if err != nil {
		fmt.Printf("Error creating watermark: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Watermark created: %+v\n", wm)
}
