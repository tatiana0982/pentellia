import { NextResponse } from "next/server";
import { query } from "@/config/db";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const {
      name,
      slug,
      description,
      long_description,
      category,
      version,
      params: toolParams,
    } = body;

    const text = `
      UPDATE tools
      SET 
        name = $1,
        slug = $2,
        description = $3,
        long_description = $4,
        category = $5,
        version = $6,
        params = $7
      WHERE id = $8
      RETURNING *
    `;

    const values = [
      name,
      slug,
      description,
      long_description,
      category,
      version,
      JSON.stringify(toolParams),
      id,
    ];

    const res = await query(text, values);

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      tool: res.rows[0],
    });
  } catch (error) {
    console.error("Update Tool Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const text = `DELETE FROM tools WHERE id = $1 RETURNING id`;
    const res = await query(text, [id]);

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
    });
  } catch (error) {
    console.error("Delete Tool Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
