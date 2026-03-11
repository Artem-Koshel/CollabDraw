using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollabDraw.Api.Migrations
{
    /// <inheritdoc />
    public partial class PixelArrayPatch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Height",
                table: "PatchEvents");

            migrationBuilder.DropColumn(
                name: "ImageData",
                table: "PatchEvents");

            migrationBuilder.DropColumn(
                name: "Width",
                table: "PatchEvents");

            migrationBuilder.DropColumn(
                name: "X",
                table: "PatchEvents");

            migrationBuilder.DropColumn(
                name: "Y",
                table: "PatchEvents");

            migrationBuilder.RenameColumn(
                name: "CompositeOperation",
                table: "PatchEvents",
                newName: "PixelsJson");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PixelsJson",
                table: "PatchEvents",
                newName: "CompositeOperation");

            migrationBuilder.AddColumn<int>(
                name: "Height",
                table: "PatchEvents",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<byte[]>(
                name: "ImageData",
                table: "PatchEvents",
                type: "BLOB",
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<int>(
                name: "Width",
                table: "PatchEvents",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "X",
                table: "PatchEvents",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Y",
                table: "PatchEvents",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }
    }
}
