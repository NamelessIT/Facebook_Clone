using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FacebookClone.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMarketplacePaymentTransactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PaymentTransactionId",
                table: "MarketplaceListings",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MarketplacePaymentTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    ReferenceCode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VerifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VerifiedById = table.Column<Guid>(type: "uuid", nullable: true),
                    FailureReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MarketplacePaymentTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MarketplacePaymentTransactions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MarketplaceListings_PaymentTransactionId",
                table: "MarketplaceListings",
                column: "PaymentTransactionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MarketplacePaymentTransactions_ReferenceCode",
                table: "MarketplacePaymentTransactions",
                column: "ReferenceCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MarketplacePaymentTransactions_UserId_Status_CreatedAt",
                table: "MarketplacePaymentTransactions",
                columns: new[] { "UserId", "Status", "CreatedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_MarketplaceListings_MarketplacePaymentTransactions_PaymentT~",
                table: "MarketplaceListings",
                column: "PaymentTransactionId",
                principalTable: "MarketplacePaymentTransactions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MarketplaceListings_MarketplacePaymentTransactions_PaymentT~",
                table: "MarketplaceListings");

            migrationBuilder.DropTable(
                name: "MarketplacePaymentTransactions");

            migrationBuilder.DropIndex(
                name: "IX_MarketplaceListings_PaymentTransactionId",
                table: "MarketplaceListings");

            migrationBuilder.DropColumn(
                name: "PaymentTransactionId",
                table: "MarketplaceListings");
        }
    }
}
