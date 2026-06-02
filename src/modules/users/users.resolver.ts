import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateUserInput } from './dto/create-user.input';
import { UserModel } from './models/user.model';
import { UsersService } from './users.service';

@Resolver(() => UserModel)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Mutation(() => UserModel)
  createUser(@Args('input') input: CreateUserInput): Promise<UserModel> {
    return this.usersService.create(input);
  }

  @Query(() => [UserModel])
  findUsers(): Promise<UserModel[]> {
    return this.usersService.findAll();
  }
}
