import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class PaginationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const page = Math.max(parseInt(request.query.page as string, 10) || 1, 1);
    const limit = Math.max(parseInt(request.query.limit as string, 10) || 20, 1);

    return next.handle().pipe(
      map((data) => {
        if (!Array.isArray(data)) {
          return data;
        }

        const total = data.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const paginatedData = data.slice(startIndex, startIndex + limit);

        return {
          data: paginatedData,
          meta: {
            total,
            page,
            limit,
            totalPages,
          },
        } as PaginatedResponse<(typeof paginatedData)[number]>;
      }),
    );
  }
}
