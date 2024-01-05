module default {
    type User {
        required name: str;
        required age: int32;

        multi link posts := .<author[is Post];
        multi link comments := .<author[is Comment];
    }

    type Post {
        required title: str;
        required content: str;
        required published: bool;

        required property created_at -> datetime {
            # Set the default value to the current timestamp
            default := datetime_current();
        }

        required author: User;

        multi link comments := .<parentPost[is Comment];
    }

    type Comment {
        required text: str;

        required property created_at -> datetime {
            # Set the default value to the current timestamp
            default := datetime_current();
        }

        parentPost: Post;
        parentComment: Comment;

        required author: User;

        multi link replies := .<parentComment[is Comment];
    }
}