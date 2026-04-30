package main

import (
	"fmt"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

func main() {
	fmt.Printf("ValidationStrict: %d\n", model.ValidationStrict)
	fmt.Printf("ValidationRelaxed: %d\n", model.ValidationRelaxed)
}
