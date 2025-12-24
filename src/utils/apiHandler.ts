import { NextResponse } from "next/server";

type ApiHandler<T> = () => Promise<T>;

export async function apiHandler<T>(handler: ApiHandler<T>) {
    try {
        const data = await handler()  as { message: string; data: unknown };

        return NextResponse.json(
            { success: true, message :  data.message , data : data.data }, { status: 200 }
        );
        
    } catch (err: any) {

        const statusCode = err.statusCode || 500;
        const message = err.message || "Internal Server Error";

        return NextResponse.json(
            {
                success: false,
                message,
                errors: err.errors ?? null,
            },
            { status: statusCode }
        );
    }
}
