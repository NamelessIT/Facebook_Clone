using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FacebookClone.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddModeratedLiveStreaming : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsLiveSuspended",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LiveSuspendedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LiveSuspensionReason",
                table: "Users",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "LiveSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Privacy = table.Column<int>(type: "integer", nullable: false),
                    IsShopping = table.Column<bool>(type: "boolean", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RecordingUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    RecordingExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConvertedPostId = table.Column<Guid>(type: "uuid", nullable: true),
                    EndedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    EndReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LiveSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LiveSessions_Posts_ConvertedPostId",
                        column: x => x.ConvertedPostId,
                        principalTable: "Posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_LiveSessions_Users_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LiveSessions_ConvertedPostId",
                table: "LiveSessions",
                column: "ConvertedPostId");

            migrationBuilder.CreateIndex(
                name: "IX_LiveSessions_OwnerId",
                table: "LiveSessions",
                column: "OwnerId",
                unique: true,
                filter: "\"Status\" = 1");

            migrationBuilder.CreateIndex(
                name: "IX_LiveSessions_OwnerId_Status",
                table: "LiveSessions",
                columns: new[] { "OwnerId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_LiveSessions_RecordingExpiresAt",
                table: "LiveSessions",
                column: "RecordingExpiresAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LiveSessions");

            migrationBuilder.DropColumn(
                name: "IsLiveSuspended",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LiveSuspendedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LiveSuspensionReason",
                table: "Users");
        }
    }
}
