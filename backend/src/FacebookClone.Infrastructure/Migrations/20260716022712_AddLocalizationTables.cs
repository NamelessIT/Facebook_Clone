using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FacebookClone.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLocalizationTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LocaleLanguages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    NativeName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocaleLanguages", x => x.Id);
                    table.UniqueConstraint("AK_LocaleLanguages_Code", x => x.Code);
                });

            migrationBuilder.CreateTable(
                name: "LocalizationEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    SourceLocale = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    TargetLocale = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    SourceText = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    Value = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    Context = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: true),
                    IsMachineTranslated = table.Column<bool>(type: "boolean", nullable: false),
                    LastError = table.Column<string>(type: "character varying(700)", maxLength: 700, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocalizationEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LocalizationEntries_LocaleLanguages_TargetLocale",
                        column: x => x.TargetLocale,
                        principalTable: "LocaleLanguages",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LocaleLanguages_Code",
                table: "LocaleLanguages",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LocalizationEntries_Key_TargetLocale",
                table: "LocalizationEntries",
                columns: new[] { "Key", "TargetLocale" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LocalizationEntries_TargetLocale",
                table: "LocalizationEntries",
                column: "TargetLocale");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LocalizationEntries");

            migrationBuilder.DropTable(
                name: "LocaleLanguages");
        }
    }
}
