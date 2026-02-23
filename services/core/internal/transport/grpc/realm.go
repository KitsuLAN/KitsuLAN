package grpc_transport

import (
	"context"
	"encoding/base64"

	pb "github.com/KitsuLAN/KitsuLAN/services/core/gen/go/kitsulan/v1"
	"github.com/KitsuLAN/KitsuLAN/services/core/internal/service"
	"github.com/KitsuLAN/KitsuLAN/services/core/pkg/errors"
)

type RealmServer struct {
	pb.UnimplementedRealmServiceServer
	svc *service.RealmService
}

func NewRealmServer(svc *service.RealmService) *RealmServer {
	return &RealmServer{svc: svc}
}

func (s *RealmServer) SetupRealm(ctx context.Context, req *pb.SetupRealmRequest) (*pb.SetupRealmResponse, error) {
	if req.Domain == "" || req.DisplayName == "" {
		return nil, errors.ValidationError("domain/display_name", "Fields are required")
	}

	realm, err := s.svc.Setup(ctx, req.Domain, req.DisplayName)
	if err != nil {
		return nil, errors.ToGRPC(err)
	}

	return &pb.SetupRealmResponse{
		RealmId:   realm.ID.String(),
		PublicKey: base64.StdEncoding.EncodeToString(realm.PubKeyEd25519),
	}, nil
}

func (s *RealmServer) GetRealmStatus(ctx context.Context, _ *pb.GetRealmStatusRequest) (*pb.GetRealmStatusResponse, error) {
	initialized, version, err := s.svc.GetStatus(ctx)
	if err != nil {
		return nil, errors.ToGRPC(err)
	}

	return &pb.GetRealmStatusResponse{
		IsInitialized: initialized,
		Version:       version,
	}, nil
}
