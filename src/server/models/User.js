import { Model } from 'sequelize';
import bcrypt from 'bcrypt';

export default function createUserModel(sequelize) {
    class User extends Model {
      // instance method to verify password
      validPassword(password) {
        return bcrypt.compare(password, this.password_hash);
      }
    }
    User.init({
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          validate: { isEmail: true },
        },
        password: {
          type: DataTypes.VIRTUAL,
          allowNull: false,
          set(value) {
            this.setDataValue('password', value);
            // trigger hash on virtual field
            const hash = bcrypt.hashSync(value, 10);
            this.setDataValue('password_hash', hash);
          },
        },
        password_hash: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        role: {
          type: DataTypes.ENUM('user', 'admin'),
          defaultValue: 'user',
        },
      }, {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
      });
        // hook to hash password before saving 
    User.beforeSave(async (user) => {
        if (user.changed('password')) {
            user.password_hash = await bcrypt.hash(user.password, 10);
        }
    });
    return User;
};
