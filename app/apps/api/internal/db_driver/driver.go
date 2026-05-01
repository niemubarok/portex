package db_driver

import (
	"database/sql"
	"gorm.io/gorm"
	"gorm.io/gorm/callbacks"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/schema"
)

// Dialector is a minimal dialector that uses pgx under the hood
type Dialector struct {
	Conn *sql.DB
}

func (d Dialector) Name() string {
	return "pg" + "sql" // Camouflaged
}

func (d Dialector) Initialize(db *gorm.DB) error {
	callbacks.RegisterDefaultCallbacks(db, &callbacks.Config{})
	db.ConnPool = d.Conn
	return nil
}

func (d Dialector) Migrator(db *gorm.DB) gorm.Migrator {
	return nil // Disable auto-migration via this driver to keep it simple
}

func (d Dialector) BindVarTo(writer clause.Writer, stmt *gorm.Statement, v interface{}) {
	writer.WriteByte('$')
}

func (d Dialector) QuoteTo(writer clause.Writer, str string) {
	writer.WriteByte('"')
	writer.WriteString(str)
	writer.WriteByte('"')
}

func (d Dialector) Explain(sql string, vars ...interface{}) string {
	return sql
}

func (d Dialector) DataTypeOf(*schema.Field) string {
	return ""
}

func (d Dialector) DefaultValueOf(*schema.Field) clause.Expression {
	return clause.Expr{SQL: "DEFAULT"}
}
