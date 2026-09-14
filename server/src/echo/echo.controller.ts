import { Controller, Get, Post, Put, Delete, Patch, Req, Body, Query, Headers } from '@nestjs/common';

@Controller('api/echo')
export class EchoController {
  @Get()
  echoGet(@Query() query: Record<string, any>, @Headers() headers: Record<string, any>) {
    return {
      message: 'GET Echo response from RestFlow Server',
      timestamp: new Date().toISOString(),
      method: 'GET',
      query,
      headers: {
        'user-agent': headers['user-agent'],
        'accept': headers['accept'],
      },
      mockData: [
        { id: 1, name: 'RestFlow Pro', type: 'HTTP Client', status: 'Active' },
        { id: 2, name: 'Echo Engine', type: 'Built-in Mock', status: 'Running' }
      ]
    };
  }

  @Post()
  echoPost(@Body() body: any, @Query() query: Record<string, any>, @Headers() headers: Record<string, any>) {
    return {
      message: 'POST Echo response from RestFlow Server',
      timestamp: new Date().toISOString(),
      method: 'POST',
      receivedData: body,
      query,
      status: 'Created',
      createdId: Math.floor(Math.random() * 1000) + 100,
      receivedHeaders: {
        authorization: headers['authorization'] || null,
        'content-type': headers['content-type'] || null,
        accept: headers['accept'] || null,
        ...headers,
      },
    };
  }

  @Put()
  echoPut(@Body() body: any, @Query() query: Record<string, any>, @Headers() headers: Record<string, any>) {
    return {
      message: 'PUT Echo response from RestFlow Server',
      timestamp: new Date().toISOString(),
      method: 'PUT',
      updatedData: body,
      query,
      status: 'Updated Successfully',
      receivedHeaders: {
        authorization: headers['authorization'] || null,
        ...headers,
      },
    };
  }

  @Delete()
  echoDelete(@Query() query: Record<string, any>, @Headers() headers: Record<string, any>) {
    return {
      message: 'DELETE Echo response from RestFlow Server',
      timestamp: new Date().toISOString(),
      method: 'DELETE',
      query,
      status: 'Resource Deleted',
      receivedHeaders: {
        authorization: headers['authorization'] || null,
        ...headers,
      },
    };
  }

  @Patch()
  echoPatch(@Body() body: any, @Headers() headers: Record<string, any>) {
    return {
      message: 'PATCH Echo response from RestFlow Server',
      timestamp: new Date().toISOString(),
      method: 'PATCH',
      patchedFields: body,
      status: 'Patched Successfully',
      receivedHeaders: {
        authorization: headers['authorization'] || null,
        ...headers,
      },
    };
  }
}
