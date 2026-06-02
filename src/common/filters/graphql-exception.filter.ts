import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';

@Catch(HttpException)
export class GraphqlExceptionFilter implements GqlExceptionFilter {
  catch(exception: HttpException, _host: ArgumentsHost): HttpException {
    return exception;
  }
}
