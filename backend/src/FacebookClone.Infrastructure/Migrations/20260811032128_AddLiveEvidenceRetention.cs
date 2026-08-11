using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FacebookClone.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLiveEvidenceRetention : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EvidenceExpiresAt",
                table: "LiveSessions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsEvidenceOnHold",
                table: "LiveSessions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql(
                """
                UPDATE "LiveSessions"
                SET "EvidenceExpiresAt" = COALESCE("EndedAt", "UpdatedAt") + INTERVAL '7 days'
                WHERE "Status" <> 1 AND "ConvertedPostId" IS NULL;

                UPDATE "LiveSessions"
                SET "IsEvidenceOnHold" = TRUE
                WHERE "Status" = 3;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_LiveSessions_IsEvidenceOnHold_EvidenceExpiresAt",
                table: "LiveSessions",
                columns: new[] { "IsEvidenceOnHold", "EvidenceExpiresAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LiveSessions_IsEvidenceOnHold_EvidenceExpiresAt",
                table: "LiveSessions");

            migrationBuilder.DropColumn(
                name: "EvidenceExpiresAt",
                table: "LiveSessions");

            migrationBuilder.DropColumn(
                name: "IsEvidenceOnHold",
                table: "LiveSessions");
        }
    }
}
